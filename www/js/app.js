/**
 * Main Entry Point
 * init all modules
 */
(function () {
  'use strict';
  const { state, DOM } = window.App;

  async function init() {
    window.App.initMap();
    window.App.initEventListeners();
    await TimelineStore.openDB();

    DOM.myNameInput.value = state.myName;

    // Get or create permanent peer ID
    state.peerId = window.App.getOrCreatePeerId();

    // Build share link immediately
    window.App.buildShareLink();

    window.App.startPeer();

    // Auto-reconnect to saved friends
    window.App.renderFriendsList();
    setTimeout(window.App.reconnectSavedFriends, 1000);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    }

    // Keep screen on so GPS doesn't stop
    window.App.requestWakeLock();

    // Start GPS immediately using Web API's
    window.App.startGPS();

    // Resume tracking when the tab becomes visible again
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        window.App.requestWakeLock();
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(window.App.handlePosition, () => { }, {
            enableHighAccuracy: true, timeout: 10000
          });
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
