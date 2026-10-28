window.addEventListener('DOMContentLoaded', () => {
  loadState();
  recalculateTargets();
  renderQuickFoods();
  renderApp();
});

// Register the PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('PWA service worker ready:', reg.scope))
      .catch((err) => console.error('PWA error:', err));
  });
}
