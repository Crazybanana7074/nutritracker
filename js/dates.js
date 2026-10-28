// =====================================================
// 4D. DATE SELECTION
// =====================================================
function shiftSelectedDate(deltaDays) {
  const today = getLocalDateStr();
  const target = addDays(state.selectedDate, deltaDays);
  if (target > today) return;
  selectDate(target);
}

function selectDate(dateStr) {
  const today = getLocalDateStr();
  state.selectedDate = dateStr > today ? today : dateStr;
  closeSleepModal();
  saveState();
  renderApp();
}
