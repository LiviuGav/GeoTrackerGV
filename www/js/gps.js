/**
 * GPS Module
 * Uses native Foreground service on Android for background tracking.
 * Falls back to Web Geolocation API on browsers.
 */
(function () {
  'use strict';
  const { CONFIG, state } = window.App;

  // Check if Capacitor native plugin is available
  function isNative() {
    return window.Capacitor &&
      window.Capacitor.isNativePlatform &&
      window.Capacitor.isNativePlatform();
  }

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

    if (isNative()) {
      startNativeGPS();
    } else {
      startWebGPS(highAccuracy);
    }
  }

  // Native Android GPS through Foreground service
  function startNativeGPS() {
    var BackgroundLocation = window.Capacitor.Plugins.BackgroundLocation;

    BackgroundLocation.addListener('locationUpdate', function (data) {
      handlePosition({
        coords: {
          latitude: data.lat,
          longitude: data.lng,
          accuracy: data.accuracy,
          speed: data.speed,
          altitude: data.altitude,
          heading: data.heading
        },
        timestamp: data.timestamp
      });
    });

    // Start the foreground service
    BackgroundLocation.startService().then(function () {
      console.log('Native foreground service started');
    }).catch(function (err) {
      console.warn('Native service failed, falling back to web GPS:', err);
      startWebGPS(true);
    });
  }

  // Web Geolocation API (browser fallback)
  function startWebGPS(highAccuracy) {
    if (!navigator.geolocation) {
      window.App.setBadge('Fără GPS', 'inactive');
      window.App.showToast('GPS nu este disponibil pe acest dispozitiv', 'error');
      return;
    }

    state.watchId = navigator.geolocation.watchPosition(
      handlePosition,
      function (err) {
        console.warn('GPS error:', err);
        if (err.code === 1) {
          window.App.setBadge('GPS refuzat', 'inactive');
          window.App.showToast('Permite accesul la locație.', 'error');
        } else if (err.code === 2) {
          window.App.setBadge('GPS indisponibil', 'inactive');
          window.App.showToast('Semnal GPS indisponibil.', 'warning');
        } else {
          if (highAccuracy) {
            window.App.showToast('Semnal GPS slab. Încercăm locația aproximativă...', 'info');
            if (state.watchId !== null) navigator.geolocation.clearWatch(state.watchId);
            startWebGPS(false);
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
    var lat = pos.coords.latitude;
    var lng = pos.coords.longitude;
    var accuracy = pos.coords.accuracy;
    var speed = pos.coords.speed;
    var altitude = pos.coords.altitude;
    var heading = pos.coords.heading;
    var timestamp = pos.timestamp || Date.now();

    state.currentPosition = { lat: lat, lng: lng, accuracy: accuracy, speed: speed, altitude: altitude, heading: heading, timestamp: timestamp };

    // Update map
    if (state.activeTab !== 'timeline') {
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
    var now = Date.now();

    if (now - state.lastSaveTime < CONFIG.SAVE_INTERVAL_MS) return;
    if (position.accuracy && position.accuracy > CONFIG.MAX_ACCURACY_M) return;

    if (state.lastSavePosition) {
      var dist = TimelineStore.haversineDistance(
        state.lastSavePosition.lat, state.lastSavePosition.lng,
        position.lat, position.lng
      );
      var minDist = Math.max(CONFIG.MIN_DISTANCE_M, position.accuracy || 0);
      if (dist < minDist) return;
    }

    TimelineStore.savePoint(position).then(function () {
      state.lastSaveTime = now;
      state.lastSavePosition = { lat: position.lat, lng: position.lng };
    }).catch(function (err) {
      console.error('Save error:', err);
    });
  }

  window.App.requestWakeLock = requestWakeLock;
  window.App.startGPS = startGPS;
  window.App.handlePosition = handlePosition;
})();
