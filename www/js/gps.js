/**
 * GPS Module
 * Web Geolocation API, WakeLock, position handling and save logic.
 */
(function () {
  'use strict';
  const { CONFIG, state } = window.App;

  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        state.wakeLock = await navigator.wakeLock.request('screen');
        state.wakeLock.addEventListener('release', () => {
        });
      } catch (e) {
      }
    }
  }

  async function startGPS(highAccuracy = true) {
    if (highAccuracy) {
      window.App.setBadge('Se localizează...', 'inactive');
    }

    if (!navigator.geolocation) {
      window.App.setBadge('Fără GPS', 'inactive');
      window.App.showToast('GPS nu este disponibil pe acest dispozitiv', 'error');
      return;
    }

    state.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => {
        console.warn('GPS error:', err);
        if (err.code === 1) {
          window.App.setBadge('GPS refuzat', 'inactive');
          window.App.showToast('Permite accesul la locație.', 'error');
        } else if (err.code === 2) {
          window.App.setBadge('GPS indisponibil', 'inactive');
          window.App.showToast(`Semnal GPS indisponibil.`, 'warning');
        } else {
          if (highAccuracy) {
            window.App.showToast('Semnal GPS slab. Încercăm locația aproximativă...', 'info');
            if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
            startGPS(false);
          } else {
            window.App.setBadge('Timeout GPS', 'inactive');
            window.App.showToast('Timeout GPS complet. Apasă pe status pentru retry.', 'warning');
          }
        }
      },
      { enableHighAccuracy: highAccuracy, timeout: 15000, maximumAge: 5000 }
    );
  }

  function handlePosition(pos) {
    const { latitude: lat, longitude: lng, accuracy, speed, altitude, heading } = pos.coords;
    const timestamp = pos.timestamp || Date.now();

    state.currentPosition = { lat, lng, accuracy, speed, altitude, heading, timestamp };

    // Update map
    if (state.activeTab === 'live') {
      window.App.updateUserMarker([lat, lng], accuracy);
    }

    // Update badge
    window.App.setBadge('Înregistrează', 'active');

    // Save to IndexedDB (with interval and distance filter)
    maybeSavePoint(state.currentPosition);

    // Broadcast to connected viewers
    window.App.broadcastLocation(state.currentPosition);
  }

  function maybeSavePoint(position) {
    const now = Date.now();

    if (now - state.lastSaveTime < CONFIG.SAVE_INTERVAL_MS) return;
    if (position.accuracy && position.accuracy > CONFIG.MAX_ACCURACY_M) return;

    if (state.lastSavePosition) {
      const dist = TimelineStore.haversineDistance(
        state.lastSavePosition.lat, state.lastSavePosition.lng,
        position.lat, position.lng
      );
      const minDist = Math.max(CONFIG.MIN_DISTANCE_M, position.accuracy || 0);
      if (dist < minDist) return;
    }

    TimelineStore.savePoint(position).then(() => {
      state.lastSaveTime = now;
      state.lastSavePosition = { lat: position.lat, lng: position.lng };
    }).catch(err => console.error('Save error:', err));
  }

  window.App.requestWakeLock = requestWakeLock;
  window.App.startGPS = startGPS;
  window.App.handlePosition = handlePosition;
})();
