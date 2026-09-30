/**
 * UI Module
 * Badge, switchTab, share modal, toasts, and formatTime utility.
 */
(function () {
  'use strict';
  const { CONFIG, state, DOM, badgeDot, badgeText } = window.App;

  function setBadge(text, type) {
    badgeText.textContent = text;
    DOM.trackingBadge.className = 'badge badge-' + type;

    if (text.includes('Timeout') || text.includes('indisponibil') || text.includes('refuzat')) {
      badgeDot.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.1-5.7L2 9"/></svg>';
      badgeDot.style.background = 'transparent';
      badgeDot.style.width = '14px';
      badgeDot.style.height = '14px';
      badgeDot.style.display = 'flex';
    } else {
      badgeDot.innerHTML = '';
      badgeDot.style = '';
    }
  }

  function switchTab(tab) {
    state.activeTab = tab;
    DOM.navItems.forEach(item => item.classList.toggle('active', item.dataset.tab === tab));

    if (state.map) {
      state.map.closePopup();
    }

    DOM.timelinePanel.classList.add('hidden');
    DOM.friendsPanel.classList.add('hidden');

    if (tab === 'timeline') {
      if (state.userMarker) state.map.removeLayer(state.userMarker);
      if (state.accuracyCircle) state.map.removeLayer(state.accuracyCircle);
      if (state.friendMarkers) {
        Object.values(state.friendMarkers).forEach(m => state.map.removeLayer(m));
      }
    } else {
      if (state.userMarker) state.userMarker.addTo(state.map);
      if (state.accuracyCircle) state.accuracyCircle.addTo(state.map);
      if (state.friendMarkers) {
        Object.values(state.friendMarkers).forEach(m => m.addTo(state.map));
      }
    }

    if (tab === 'timeline') {
      DOM.timelinePanel.classList.remove('hidden');
      window.App.buildDateStrip();
      window.App.loadTimeline(state.selectedDate);
    } else if (tab === 'live') {
      window.App.clearTimelineRoute();
      if (state.currentPosition) {
        window.App.updateUserMarker([state.currentPosition.lat, state.currentPosition.lng], state.currentPosition.accuracy);
        state.map.setView([state.currentPosition.lat, state.currentPosition.lng], CONFIG.LOCATION_ZOOM);
      }
    } else if (tab === 'friends') {
      window.App.clearTimelineRoute();
      DOM.friendsPanel.classList.remove('hidden');
      window.App.renderFriendsList();
      if (state.currentPosition) {
        window.App.updateUserMarker([state.currentPosition.lat, state.currentPosition.lng], state.currentPosition.accuracy);
      }
    }
  }

  function openShareModal() {
    DOM.shareModal.classList.remove('hidden');
  }

  function closeShareModal() {
    DOM.shareModal.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const icons = {
      success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>',
      error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function formatTime(date) {
    return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  }

  window.App.setBadge = setBadge;
  window.App.switchTab = switchTab;
  window.App.openShareModal = openShareModal;
  window.App.closeShareModal = closeShareModal;
  window.App.showToast = showToast;
  window.App.formatTime = formatTime;
})();
