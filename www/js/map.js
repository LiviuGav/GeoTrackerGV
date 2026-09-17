/**
 * Map Module
 * Handles Leaflet map initialization and user marker updates.
 */
(function () {
  'use strict';
  const { CONFIG, state } = window.App;

  function initMap() {
    state.map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      center: CONFIG.DEFAULT_CENTER,
      zoom: CONFIG.DEFAULT_ZOOM
    });

    L.tileLayer(CONFIG.TILES, {
      attribution: CONFIG.TILE_ATTR,
      maxZoom: 19
    }).addTo(state.map);

    L.control.zoom({ position: 'topright' }).addTo(state.map);
  }

  function createUserMarker(latlng) {
    const icon = L.divIcon({
      className: 'custom-marker',
      html: '<div class="marker-pulse-ring"></div><div class="marker-dot"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    state.userMarker = L.marker(latlng, { icon, zIndexOffset: 1000 }).addTo(state.map);
    state.accuracyCircle = L.circle(latlng, {
      radius: 10,
      className: 'marker-accuracy',
      weight: 1,
      fillOpacity: 0.1
    }).addTo(state.map);
  }

  function updateUserMarker(latlng, accuracy) {
    if (!state.userMarker) {
      createUserMarker(latlng);
      state.map.setView(latlng, CONFIG.LOCATION_ZOOM);
    } else {
      state.userMarker.setLatLng(latlng);
      state.accuracyCircle.setLatLng(latlng);
      state.accuracyCircle.setRadius(accuracy || 10);
    }
  }

  window.App.initMap = initMap;
  window.App.updateUserMarker = updateUserMarker;
})();
