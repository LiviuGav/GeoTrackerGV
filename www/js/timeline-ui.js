/**
 * Timeline UI Module
 * Timeline panel: date strip, route drawing, slider, entries, export/delete.
 */
(function () {
  'use strict';
  const { CONFIG, state, DOM } = window.App;

  async function loadTimeline(dateStr) {
    state.selectedDate = dateStr;
    const points = await TimelineStore.getPointsByDate(dateStr);
    state.timelinePoints = points.sort((a, b) => a.timestamp - b.timestamp);

    const stats = TimelineStore.calculateStats(points);
    DOM.statPoints.textContent = stats.pointCount;
    DOM.statDistance.textContent = TimelineStore.formatDistance(stats.distance);
    DOM.statDuration.textContent = TimelineStore.formatDuration(stats.duration);
    DOM.statSpeed.textContent = stats.avgSpeed > 0 ? stats.avgSpeed.toFixed(1) + ' km/h' : '0 km/h';

    if (points.length > 1) {
      DOM.timelineSliderContainer.classList.remove('hidden');
      DOM.timelineSlider.max = points.length - 1;
      DOM.timelineSlider.value = points.length - 1;

      DOM.sliderStartTime.textContent = window.App.formatTime(new Date(stats.startTime));
      DOM.sliderEndTime.textContent = window.App.formatTime(new Date(stats.endTime));
      DOM.sliderCurrentTime.textContent = window.App.formatTime(new Date(stats.endTime));
    } else {
      DOM.timelineSliderContainer.classList.add('hidden');
    }

    drawTimelineRoute(points);
    renderTimelineEntries(points);
  }

  function drawTimelineRoute(points, upToIndex) {
    clearTimelineRoute();
    if (!points || points.length === 0) return;

    const displayPoints = upToIndex !== undefined
      ? points.slice(0, upToIndex + 1)
      : points;
    if (displayPoints.length === 0) return;

    const latlngs = displayPoints.map(p => [p.lat, p.lng]);

    state.timelinePolyline = L.polyline(latlngs, {
      color: '#00d4aa',
      weight: 3,
      opacity: 0.8,
      smoothFactor: 1,
      lineJoin: 'round'
    }).addTo(state.map);

    // Start marker (green)
    const startIcon = L.divIcon({
      className: 'tl-marker',
      html: '<div style="width:12px;height:12px;background:#22c55e;border:2px solid white;border-radius:50%;box-shadow:0 0 8px rgba(34,197,94,0.5);"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });

    // End marker (teal)
    const endIcon = L.divIcon({
      className: 'tl-marker',
      html: '<div style="width:14px;height:14px;background:#00d4aa;border:3px solid white;border-radius:50%;box-shadow:0 0 12px rgba(0,212,170,0.5);"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    state.timelineMarkers.push(
      L.marker(latlngs[0], { icon: startIcon }).addTo(state.map),
      L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(state.map)
    );

    if (latlngs.length > 1) {
      state.map.fitBounds(state.timelinePolyline.getBounds(), { padding: [60, 60] });
    } else {
      state.map.setView(latlngs[0], CONFIG.LOCATION_ZOOM);
    }
  }

  function clearTimelineRoute() {
    if (state.timelinePolyline) {
      state.map.removeLayer(state.timelinePolyline);
      state.timelinePolyline = null;
    }
    state.timelineMarkers.forEach(m => state.map.removeLayer(m));
    state.timelineMarkers = [];
  }

  async function buildDateStrip() {
    const datesWithData = await TimelineStore.getDatesWithData();
    const today = TimelineStore.today();
    const days = [];

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = TimelineStore.formatDate(d);
      days.push({
        dateStr, date: d,
        hasData: datesWithData.includes(dateStr),
        isToday: dateStr === today
      });
    }

    DOM.dateStrip.innerHTML = '';
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

    days.forEach(day => {
      const btn = document.createElement('button');
      btn.className = 'date-item';
      if (day.dateStr === state.selectedDate) btn.classList.add('active');
      if (day.isToday) btn.classList.add('today');

      btn.innerHTML = `
        <span class="date-day-name">${day.isToday ? 'Azi' : dayNames[day.date.getDay()]}</span>
        <span class="date-day-num">${day.date.getDate()}</span>
        ${day.hasData ? '<span class="date-has-data"></span>' : ''}
      `;

      btn.addEventListener('click', () => {
        DOM.dateStrip.querySelectorAll('.date-item').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        loadTimeline(day.dateStr);
      });

      DOM.dateStrip.appendChild(btn);
    });
  }

  function renderTimelineEntries(points) {
    if (!points || points.length === 0) {
      DOM.timelineEntries.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Nicio înregistrare pentru această zi</div>';
      return;
    }

    const entries = [];
    let lastTime = 0;
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || i === points.length - 1 || points[i].timestamp - lastTime > 600000) {
        entries.push(points[i]);
        lastTime = points[i].timestamp;
      }
    }

    DOM.timelineEntries.innerHTML = entries.map((p, idx) => {
      const time = window.App.formatTime(new Date(p.timestamp));
      let label = idx === 0 ? 'Start' : idx === entries.length - 1 ? 'Ultima poziție' : `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
      return `<div class="timeline-entry"><span class="timeline-entry-time">${time}</span><span class="timeline-entry-info">${label}</span></div>`;
    }).join('');
  }

  window.App.loadTimeline = loadTimeline;
  window.App.drawTimelineRoute = drawTimelineRoute;
  window.App.clearTimelineRoute = clearTimelineRoute;
  window.App.buildDateStrip = buildDateStrip;
})();
