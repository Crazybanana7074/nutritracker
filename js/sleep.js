// =====================================================
// 4C. SLEEP TRACKING ENGINE
// =====================================================
function calculateSleepDurationMinutes(bedTimeStr, wakeTimeStr) {
  if (!/^\d{2}:\d{2}$/.test(bedTimeStr) || !/^\d{2}:\d{2}$/.test(wakeTimeStr)) return null;
  const [bH, bM] = bedTimeStr.split(':').map(Number);
  const [wH, wM] = wakeTimeStr.split(':').map(Number);
  const bedMins = bH * 60 + bM;
  let wakeMins = wH * 60 + wM;
  if (wakeMins <= bedMins) {
    wakeMins += 1440;
  }
  const duration = wakeMins - bedMins;
  if (duration < 30 || duration > 1080) return null;
  return duration;
}

function formatDurationMinutes(totalMins) {
  if (!totalMins || totalMins <= 0) return '0h 0m';
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function renderSleepCard() {
  const entry = getSleepForDate(state.selectedDate);
  const summaryEl = document.getElementById('sleepCardSummary');
  if (!summaryEl) return;

  if (!entry) {
    summaryEl.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Sleep</h2>
          <p class="text-xs text-slate-400 mt-0.5">No sleep logged for ${state.selectedDate}</p>
        </div>
        <button onclick="openSleepModal()" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold text-xs px-3 py-1.5 rounded-xl">
          + Log Sleep
        </button>
      </div>
    `;
  } else {
    summaryEl.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Sleep</h2>
            <span class="text-[10px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">${entry.bedTime} → ${entry.wakeTime}</span>
          </div>
          <div class="text-sm font-extrabold text-white mt-1">${formatDurationMinutes(entry.durationMinutes)}</div>
        </div>
        <button onclick="openSleepModal()" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs px-3 py-1.5 rounded-xl">
          Edit
        </button>
      </div>
    `;
  }
}

function openSleepModal() {
  const existing = getSleepForDate(state.selectedDate);
  document.getElementById('sleepBedTimeInput').value = existing ? existing.bedTime : '23:15';
  document.getElementById('sleepWakeTimeInput').value = existing ? existing.wakeTime : '07:05';
  document.getElementById('deleteSleepBtn').classList.toggle('hidden', !existing);
  document.getElementById('sleepErrorText').classList.add('hidden');
  document.getElementById('sleepFormDrawer').classList.remove('hidden');
  previewSleepDuration();
}

function closeSleepModal() {
  document.getElementById('sleepFormDrawer').classList.add('hidden');
}

function previewSleepDuration() {
  const bed = document.getElementById('sleepBedTimeInput').value;
  const wake = document.getElementById('sleepWakeTimeInput').value;
  const mins = calculateSleepDurationMinutes(bed, wake);
  const previewEl = document.getElementById('sleepPreviewText');
  const errEl = document.getElementById('sleepErrorText');

  if (mins === null) {
    previewEl.textContent = 'Duration: —';
    errEl.textContent = 'Enter a valid range (30m – 18h)';
    errEl.classList.remove('hidden');
  } else {
    previewEl.textContent = `Calculated: ${formatDurationMinutes(mins)}`;
    errEl.classList.add('hidden');
  }
}

function saveSleepEntry() {
  const wakeDate = state.selectedDate;
  const bedTime = document.getElementById('sleepBedTimeInput').value;
  const wakeTime = document.getElementById('sleepWakeTimeInput').value;
  const errEl = document.getElementById('sleepErrorText');

  const durationMinutes = calculateSleepDurationMinutes(bedTime, wakeTime);
  if (durationMinutes === null) {
    errEl.textContent = 'Invalid time span (must be 30m to 18h)';
    errEl.classList.remove('hidden');
    return;
  }

  const existingIdx = state.sleepLogs.findIndex(s => s.date === wakeDate);
  const record = {
    id: existingIdx >= 0 ? state.sleepLogs[existingIdx].id : Date.now(),
    date: wakeDate,
    bedTime,
    wakeTime,
    durationMinutes,
    updatedAt: Date.now()
  };

  if (existingIdx >= 0) state.sleepLogs[existingIdx] = record;
  else state.sleepLogs.push(record);

  saveState();
  closeSleepModal();
  renderApp();
  showToast('Sleep saved');
}

function deleteSleepEntry() {
  const wakeDate = state.selectedDate;
  state.sleepLogs = state.sleepLogs.filter(s => s.date !== wakeDate);
  saveState();
  closeSleepModal();
  renderApp();
  showToast('Sleep entry deleted');
}
