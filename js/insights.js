// =====================================================
// 4B. INSIGHTS ENGINE
// =====================================================
function getInsightsDateList() {
  const today = getLocalDateStr();
  if (state.insights.mode === 'week') {
    const monday = getMondayOfWeek(state.insights.anchorDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      days.push({ date: d, isFuture: d > today });
    }
    return {
      mode: 'week',
      startDate: monday,
      endDate: addDays(monday, 6),
      label: formatShortRange(monday, addDays(monday, 6)),
      canGoNext: addDays(monday, 7) <= today,
      days
    };
  } else {
    const d = parseLocalDate(state.insights.anchorDate);
    const year = d.getFullYear();
    const month = d.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const days = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({ date: ds, isFuture: ds > today });
    }
    const nextMonthStart = new Date(year, month + 1, 1, 12, 0, 0);
    return {
      mode: 'month',
      startDate: days[0].date,
      endDate: days[days.length - 1].date,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      canGoNext: getLocalDateStr(nextMonthStart) <= today,
      days
    };
  }
}

function aggregatePeriodStats(periodInfo) {
  const validDays = periodInfo.days.filter(d => !d.isFuture);
  const dailyRecords = validDays.map(d => {
    const nut = computeTotalsForDate(d.date);
    const sleep = getSleepForDate(d.date);
    return { date: d.date, nut, sleep };
  });

  const trackedNutDays = dailyRecords.filter(r => r.nut.isTracked);
  const trackedSleepDays = dailyRecords.filter(r => r.sleep && r.sleep.durationMinutes > 0);

  const avg = (arr, fn) => arr.length ? arr.reduce((s, x) => s + fn(x), 0) / arr.length : null;

  const avgCal = avg(trackedNutDays, r => r.nut.cal);
  const avgPro = avg(trackedNutDays, r => r.nut.pro);
  const avgCarbs = avg(trackedNutDays, r => r.nut.carbs);
  const avgNetCarbs = avg(trackedNutDays, r => r.nut.netCarbs);
  const avgFiber = avg(trackedNutDays, r => r.nut.fiber);
  const avgFat = avg(trackedNutDays, r => r.nut.fat);
  const avgSat = avg(trackedNutDays, r => r.nut.sat);
  const avgMicroCov = avg(trackedNutDays, r => r.nut.microCoveragePct);
  const avgMicroHits = avg(trackedNutDays, r => r.nut.microHitCount);

  const proGoalHitDays = trackedNutDays.filter(r => r.nut.pro >= state.targets.pro * 0.95).length;
  const calNearGoalDays = trackedNutDays.filter(r => Math.abs(r.nut.cal - state.targets.cal) <= state.targets.cal * 0.12).length;

  const microBreakdown = MICRO_META.map(m => {
    const goal = state.targets.micros[m.key] || 1;
    const meanVal = avg(trackedNutDays, r => r.nut.micros[m.key] || 0);
    const pct = meanVal !== null ? Math.round((meanVal / goal) * 100) : null;
    return { ...m, meanVal, goal, pct };
  });

  const avgSleepMin = avg(trackedSleepDays, r => r.sleep.durationMinutes);
  let sleepRegularityLabel = 'Need 3+ logs';
  let bedTimeSpreadMin = null;
  if (trackedSleepDays.length >= 3) {
    const bedMinutes = trackedSleepDays.map(r => {
      const [h, m] = r.sleep.bedTime.split(':').map(Number);
      let mins = h * 60 + m;
      if (mins < 720) mins += 1440;
      return mins;
    });
    bedTimeSpreadMin = Math.max(...bedMinutes) - Math.min(...bedMinutes);
    sleepRegularityLabel = bedTimeSpreadMin <= 45 ? 'Consistent' : bedTimeSpreadMin <= 90 ? 'Moderate shift' : 'Irregular';
  }

  return {
    periodInfo,
    elapsedDaysCount: validDays.length,
    totalCalendarDays: periodInfo.days.length,
    dailyRecords,
    trackedNutCount: trackedNutDays.length,
    trackedSleepCount: trackedSleepDays.length,
    avgCal, avgPro, avgCarbs, avgNetCarbs, avgFiber, avgFat, avgSat,
    avgMicroCov, avgMicroHits,
    proGoalHitDays, calNearGoalDays,
    microBreakdown,
    avgSleepMin,
    sleepRegularityLabel,
    bedTimeSpreadMin
  };
}

function setInsightsMode(mode) {
  state.insights.mode = mode;
  state.insights.aiResult = null;
  state.insights.aiError = null;
  document.getElementById('ins-mode-week').className = mode === 'week'
    ? 'bg-emerald-500 text-slate-950 font-bold text-xs py-1 rounded-lg'
    : 'text-slate-400 font-semibold text-xs py-1 rounded-lg';
  document.getElementById('ins-mode-month').className = mode === 'month'
    ? 'bg-emerald-500 text-slate-950 font-bold text-xs py-1 rounded-lg'
    : 'text-slate-400 font-semibold text-xs py-1 rounded-lg';
  renderInsightsTab();
}

function shiftInsightsPeriod(dir) {
  const info = getInsightsDateList();
  if (dir > 0 && !info.canGoNext) return;
  if (state.insights.mode === 'week') {
    state.insights.anchorDate = addDays(state.insights.anchorDate, dir * 7);
  } else {
    const d = parseLocalDate(state.insights.anchorDate);
    d.setMonth(d.getMonth() + dir);
    state.insights.anchorDate = getLocalDateStr(d);
  }
  state.insights.aiResult = null;
  state.insights.aiError = null;
  renderInsightsTab();
}

function inspectDayFromInsights(dateStr) {
  selectDate(dateStr);
  switchTab('today');
}

function renderInsightsTab() {
  const periodInfo = getInsightsDateList();
  const stats = aggregatePeriodStats(periodInfo);
  const t = state.targets;

  document.getElementById('insightsRangeLabel').textContent = periodInfo.label;
  document.getElementById('insightsCoverageBadge').textContent =
    `${stats.trackedNutCount} of ${stats.elapsedDaysCount} days tracked`;

  const nextBtn = document.getElementById('insightsNextBtn');
  nextBtn.disabled = !periodInfo.canGoNext;
  nextBtn.className = periodInfo.canGoNext
    ? 'text-slate-300 hover:text-white bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold'
    : 'text-slate-700 bg-slate-950/50 border border-slate-800/40 rounded-lg px-2.5 py-1 text-xs font-bold cursor-not-allowed';

  const calDelta = stats.avgCal !== null ? Math.round(stats.avgCal - t.cal) : null;
  const calSub = stats.avgCal !== null
    ? `${calDelta >= 0 ? '+' : ''}${calDelta} vs ${t.cal} target`
    : 'No logged food days';
  const calPct = stats.avgCal !== null ? Math.min(100, Math.round((stats.avgCal / t.cal) * 100)) : 0;

  const proSub = stats.avgPro !== null
    ? `Goal hit ${stats.proGoalHitDays}/${stats.trackedNutCount} tracked days`
    : 'No logged food days';
  const proPct = stats.avgPro !== null ? Math.min(100, Math.round((stats.avgPro / t.pro) * 100)) : 0;

  const microSub = stats.avgMicroCov !== null
    ? `${stats.avgMicroHits.toFixed(1)}/18 avg targets (est.)`
    : 'Nutrition DB estimate';
  const microPct = stats.avgMicroCov !== null ? stats.avgMicroCov : 0;

  const sleepSub = stats.avgSleepMin !== null
    ? `${stats.trackedSleepCount} nights · ${stats.sleepRegularityLabel}`
    : 'No sleep logged yet';
  const sleepPct = stats.avgSleepMin !== null ? Math.min(100, Math.round((stats.avgSleepMin / t.sleepMinutes) * 100)) : 0;

  document.getElementById('insightsKpiGrid').innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
      <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Average Calories</span>
      <div class="text-base font-extrabold text-white">${stats.avgCal !== null ? `${Math.round(stats.avgCal)} kcal` : '—'}</div>
      <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-400" style="width:${calPct}%"></div>
      </div>
      <div class="text-[10px] text-slate-400">${calSub}</div>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
      <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Protein</span>
      <div class="text-base font-extrabold text-white">${stats.avgPro !== null ? `${Math.round(stats.avgPro)}g / day` : '—'}</div>
      <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div class="h-full bg-sky-400" style="width:${proPct}%"></div>
      </div>
      <div class="text-[10px] text-slate-400">${proSub}</div>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
      <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Micronutrients</span>
      <div class="text-base font-extrabold text-white">${stats.avgMicroCov !== null ? `${stats.avgMicroCov}% cov.` : '—'}</div>
      <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-400" style="width:${microPct}%"></div>
      </div>
      <div class="text-[10px] text-slate-400">${microSub}</div>
    </div>

    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1.5">
      <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Average Sleep</span>
      <div class="text-base font-extrabold text-white">${stats.avgSleepMin !== null ? formatDurationMinutes(Math.round(stats.avgSleepMin)) : '—'}</div>
      <div class="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
        <div class="h-full bg-indigo-400" style="width:${sleepPct}%"></div>
      </div>
      <div class="text-[10px] text-slate-400">${sleepSub}</div>
    </div>
  `;

  const trendsEl = document.getElementById('insightsTrendsContainer');
  if (periodInfo.mode === 'week') {
    document.getElementById('trendsSubtitle').textContent = 'Tap any day to open Day View';
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    trendsEl.innerHTML = periodInfo.days.map((dObj, idx) => {
      const nut = computeTotalsForDate(dObj.date);
      const sleep = getSleepForDate(dObj.date);
      if (dObj.isFuture) {
        return `
          <div class="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg opacity-40">
            <span class="w-10 font-semibold text-slate-500">${dayNames[idx]}</span>
            <span class="text-slate-600 flex-1 text-center">Upcoming</span>
            <span class="w-16 text-right text-slate-600">—</span>
          </div>`;
      }
      const calPctBar = nut.isTracked ? Math.min(100, Math.round((nut.cal / t.cal) * 100)) : 0;
      const calColor = nut.isTracked ? getStatusColor(nut.cal, t.cal, true).bgClass : 'bg-slate-800';
      const sleepText = sleep ? formatDurationMinutes(sleep.durationMinutes) : 'No sleep';
      return `
        <button onclick="inspectDayFromInsights('${dObj.date}')" class="w-full text-left bg-slate-950 hover:bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 transition space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-white">${dayNames[idx]} <span class="text-slate-500 font-normal">${dObj.date.slice(8)}</span></span>
            <div class="flex items-center gap-2.5">
              <span class="${nut.isTracked ? 'text-slate-200 font-semibold' : 'text-slate-500 italic'}">
                ${nut.isTracked ? `${Math.round(nut.cal)} / ${t.cal} kcal` : 'Not tracked'}
              </span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 ${sleep ? 'text-indigo-300 font-semibold' : 'text-slate-500'}">
                ${sleepText}
              </span>
            </div>
          </div>
          <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div class="h-full ${calColor}" style="width:${calPctBar}%"></div>
          </div>
        </button>
      `;
    }).join('');
  } else {
    document.getElementById('trendsSubtitle').textContent = 'Grouped by weeks of month';
    const buckets = [];
    for (let i = 0; i < periodInfo.days.length; i += 7) {
      const slice = periodInfo.days.slice(i, i + 7);
      const validSlice = slice.filter(x => !x.isFuture);
      const nutDays = validSlice.map(x => computeTotalsForDate(x.date)).filter(n => n.isTracked);
      const sleepDays = validSlice.map(x => getSleepForDate(x.date)).filter(Boolean);
      const avgWCal = nutDays.length ? Math.round(nutDays.reduce((s, n) => s + n.cal, 0) / nutDays.length) : null;
      const avgWPro = nutDays.length ? Math.round(nutDays.reduce((s, n) => s + n.pro, 0) / nutDays.length) : null;
      const avgWSleep = sleepDays.length ? Math.round(sleepDays.reduce((s, sl) => s + sl.durationMinutes, 0) / sleepDays.length) : null;
      buckets.push({
        label: `W${Math.floor(i / 7) + 1} (${slice[0].date.slice(8)}–${slice[slice.length - 1].date.slice(8)})`,
        trackedCount: nutDays.length,
        totalDays: validSlice.length,
        avgWCal, avgWPro, avgWSleep
      });
    }
    trendsEl.innerHTML = buckets.map(b => {
      const pct = b.avgWCal !== null ? Math.min(100, Math.round((b.avgWCal / t.cal) * 100)) : 0;
      return `
        <div class="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5">
          <div class="flex items-center justify-between text-[11px]">
            <span class="font-bold text-white">${b.label} <span class="text-[10px] text-slate-500 font-normal">(${b.trackedCount}/${b.totalDays}d)</span></span>
            <span class="text-slate-300 font-semibold">
              ${b.avgWCal !== null ? `${b.avgWCal} kcal · ${b.avgWPro}g P` : 'No nutrition logs'}
            </span>
          </div>
          <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-400" style="width:${pct}%"></div>
          </div>
          <div class="flex justify-between text-[10px] text-slate-400">
            <span>Target: ${t.cal} kcal</span>
            <span>Avg Sleep: <strong class="text-indigo-300">${b.avgWSleep !== null ? formatDurationMinutes(b.avgWSleep) : '—'}</strong></span>
          </div>
        </div>
      `;
    }).join('');
  }

  const lowMicros = stats.microBreakdown.filter(m => !m.isCap && m.pct !== null && m.pct < 75).slice(0, 5);
  const topMicros = stats.microBreakdown.filter(m => !m.isCap && m.pct !== null && m.pct >= 90).slice(0, 5);

  document.getElementById('insightsAccordions').innerHTML = `
    <details class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 group">
      <summary class="text-xs font-bold text-slate-200 cursor-pointer list-none flex justify-between items-center">
        <span>Calorie and Macronutrient Details</span>
        <span class="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div class="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Avg Total / Net Carbs</span><strong class="text-white">${stats.avgCarbs !== null ? `${Math.round(stats.avgCarbs)}g / ${Math.round(stats.avgNetCarbs)}g` : '—'}</strong></div>
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Avg Dietary Fiber</span><strong class="text-white">${stats.avgFiber !== null ? `${stats.avgFiber.toFixed(1)}g / ${t.fiber}g` : '—'}</strong></div>
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Avg Total Fat</span><strong class="text-white">${stats.avgFat !== null ? `${Math.round(stats.avgFat)}g / ${t.fat}g` : '—'}</strong></div>
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Avg Saturated Fat</span><strong class="text-white">${stats.avgSat !== null ? `${stats.avgSat.toFixed(1)}g (Cap ${t.satCap}g)` : '—'}</strong></div>
      </div>
    </details>

    <details class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 group">
      <summary class="text-xs font-bold text-slate-200 cursor-pointer list-none flex justify-between items-center">
        <span>Micronutrient Overview</span>
        <span class="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div class="mt-2.5 pt-2.5 border-t border-slate-800 space-y-2 text-[11px]">
        <p class="text-[10px] text-slate-400">Derived from FoodData Central profiles and comprehensive AI estimations.</p>
        ${stats.trackedNutCount === 0 ? '<p class="text-slate-500">Log meals to view micronutrient coverage.</p>' : `
          <div>
            <span class="text-[10px] uppercase font-bold text-emerald-400">Consistently Met (≥90%)</span>
            <p class="text-slate-300 mt-0.5">${topMicros.length ? topMicros.map(m => `${m.label} (${m.pct}%)`).join(', ') : 'None ≥90% yet'}</p>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-amber-400">Below 75% Target</span>
            <p class="text-slate-300 mt-0.5">${lowMicros.length ? lowMicros.map(m => `${m.label} (${m.pct}%)`).join(', ') : 'All tracked micronutrients ≥75%'}</p>
          </div>
        `}
      </div>
    </details>

    <details class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 group">
      <summary class="text-xs font-bold text-slate-200 cursor-pointer list-none flex justify-between items-center">
        <span>Sleep Details</span>
        <span class="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div class="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Logged Nights</span><strong class="text-white">${stats.trackedSleepCount} of ${stats.elapsedDaysCount}</strong></div>
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Bedtime Regularity</span><strong class="text-white">${stats.sleepRegularityLabel}${stats.bedTimeSpreadMin !== null ? ` (±${Math.round(stats.bedTimeSpreadMin/2)}m)` : ''}</strong></div>
      </div>
    </details>

    <details class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 group">
      <summary class="text-xs font-bold text-slate-200 cursor-pointer list-none flex justify-between items-center">
        <span>Tracking Consistency</span>
        <span class="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div class="mt-2.5 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Nutrition Coverage</span><strong class="text-white">${stats.trackedNutCount}/${stats.elapsedDaysCount} days (${stats.elapsedDaysCount ? Math.round((stats.trackedNutCount/stats.elapsedDaysCount)*100) : 0}%)</strong></div>
        <div class="bg-slate-950 p-2 rounded-lg"><span class="text-slate-400 block text-[10px]">Calories Within ±12%</span><strong class="text-white">${stats.calNearGoalDays}/${stats.trackedNutCount || 0} tracked days</strong></div>
      </div>
    </details>
  `;

  const consentBox = document.getElementById('aiConsentBox');
  const consentChk = document.getElementById('aiConsentCheckbox');
  if (consentChk) consentChk.checked = state.aiConsentGiven;
  if (consentBox) consentBox.classList.toggle('hidden', state.aiConsentGiven);

  renderAiReviewState();
}
