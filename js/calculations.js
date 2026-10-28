// =====================================================
// 3. CALCULATIONS
// =====================================================
function getItemsForDate(dateStr) {
  return state.loggedItems.filter(item => item.date === dateStr);
}

function getSleepForDate(dateStr) {
  return state.sleepLogs.find(s => s.date === dateStr) || null;
}

function computeTotalsForDate(dateStr) {
  const items = getItemsForDate(dateStr);
  const totals = {
    date: dateStr,
    itemCount: items.length,
    isTracked: false,
    cal: 0, pro: 0, carbs: 0, fiber: 0, netCarbs: 0,
    fat: 0, sat: 0, mono: 0, poly: 0,
    micros: {},
    microHitCount: 0,
    microCoveragePct: 0
  };
  MICRO_META.forEach(m => totals.micros[m.key] = 0);

items.forEach(entry => {
    const f = getNutrientProfile(entry);
    if (!f) return;

    const scale = f.isSupplement ? (entry.grams || 1) : (entry.grams / 100.0);

    totals.cal += f.cal * scale;
    totals.pro += f.pro * scale;
    totals.carbs += f.carbs * scale;
    totals.fiber += f.fiber * scale;
    totals.fat += f.fat * scale;
    totals.sat += f.sat * scale;
    totals.mono += f.mono * scale;
    totals.poly += f.poly * scale;
    MICRO_META.forEach(m => {
      totals.micros[m.key] += (f.micros[m.key] || 0) * scale;
    });
  });

  totals.netCarbs = Math.max(0, totals.carbs - totals.fiber);
  totals.isTracked = totals.itemCount > 0 && totals.cal > 0;

  if (totals.isTracked) {
    let ratioSum = 0;
    let hits = 0;
    MICRO_META.forEach(m => {
      const val = totals.micros[m.key] || 0;
      const goal = state.targets.micros[m.key] || 1;
      if (m.isCap) {
        const ok = val <= goal;
        if (ok) hits++;
        ratioSum += ok ? 1 : Math.max(0, 1 - ((val - goal) / goal));
      } else {
        if (val >= goal * 0.9) hits++;
        ratioSum += Math.min(1, val / goal);
      }
    });
    totals.microHitCount = hits;
    totals.microCoveragePct = Math.round((ratioSum / MICRO_META.length) * 100);
  }

  return totals;
}

function getStatusColor(logged, target, isCap = false) {
  const ratio = target > 0 ? logged / target : 0;
  if (isCap) {
    if (ratio > 1.0) return { hex: '#f43f5e', textClass: 'text-rose-400', bgClass: 'bg-rose-500' };
    if (ratio >= 0.85) return { hex: '#f59e0b', textClass: 'text-amber-400', bgClass: 'bg-amber-400' };
    return { hex: '#10b981', textClass: 'text-emerald-400', bgClass: 'bg-emerald-400' };
  } else {
    if (ratio >= 0.9) return { hex: '#10b981', textClass: 'text-emerald-400', bgClass: 'bg-emerald-400' };
    if (ratio >= 0.5) return { hex: '#f59e0b', textClass: 'text-amber-400', bgClass: 'bg-amber-400' };
    return { hex: '#38bdf8', textClass: 'text-sky-400', bgClass: 'bg-sky-400' };
  }
}
