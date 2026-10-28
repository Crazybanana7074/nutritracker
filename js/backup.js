function exportBackupJson() {
  let payload;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    payload = raw ? JSON.parse(raw) : null;
  } catch (error) {
    payload = null;
  }
  if (!payload || typeof payload !== 'object') {
    payload = {
      schemaVersion: 2,
      selectedDate: state.selectedDate,
      profile: state.profile,
      loggedItems: state.loggedItems,
      sleepLogs: state.sleepLogs,
      customFoods: state.customFoods,
      migrationNoticePending: state.migrationNoticePending,
      aiConsentGiven: state.aiConsentGiven
    };
  }
  payload.exportedAt = new Date().toISOString();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `nutritracker-backup-${getLocalDateStr()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast('Backup downloaded');
}

function importBackupJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => {
    showToast('Could not read the backup file');
    event.target.value = '';
  };
  reader.onload = (loadEvent) => {
    try {
      const parsed = JSON.parse(loadEvent.target.result);
      const incoming = parsed && parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
      if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming) ||
          (!Array.isArray(incoming.loggedItems) && !incoming.profile && !incoming.customFoods && !Array.isArray(incoming.sleepLogs))) {
        throw new Error('Invalid backup format');
      }

      let current = {};
      try {
        current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
      } catch (error) {
        current = {};
      }
      const currentItems = Array.isArray(current.loggedItems) ? current.loggedItems : [];
      const incomingItems = Array.isArray(incoming.loggedItems) ? incoming.loggedItems : [];
      const mergeById = (a, b, keyFn) => {
        const result = new Map();
        [...a, ...b].forEach((item, index) => {
          if (!item || typeof item !== 'object') return;
          const key = keyFn(item, index);
          if (key !== null && key !== undefined && key !== '') result.set(String(key), item);
        });
        return Array.from(result.values());
      };
      const merged = {
        schemaVersion: 2,
        selectedDate: incoming.selectedDate || current.selectedDate || getLocalDateStr(),
        profile: { ...(current.profile || {}), ...(incoming.profile || {}) },
        loggedItems: mergeById(currentItems, incomingItems, (item, index) => item.id ?? `import-${index}-${item.date || ''}-${item.name || ''}`),
        sleepLogs: mergeById(
          Array.isArray(current.sleepLogs) ? current.sleepLogs : [],
          Array.isArray(incoming.sleepLogs) ? incoming.sleepLogs : [],
          (item, index) => item.date || item.id || `sleep-${index}`
        ),
        customFoods: { ...(current.customFoods || {}), ...(incoming.customFoods || {}) },
        migrationNoticePending: Boolean(current.migrationNoticePending || incoming.migrationNoticePending),
        aiConsentGiven: Boolean(incoming.aiConsentGiven ?? current.aiConsentGiven)
      };
      // Save under the same key used by existing versions. Do not delete legacy data.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      loadState();
      recalculateTargets();
      renderQuickFoods();
      renderApp();
      showToast('Backup imported and merged successfully');
    } catch (error) {
      console.error('Backup import failed:', error);
      showToast('Invalid backup file — existing data was not changed');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}
