/**
 * Events Module
 */
(function () {
  'use strict';
  const { CONFIG, state, DOM } = window.App;

  function initEventListeners() {
    // My location
    DOM.btnMyLocation.addEventListener('click', () => {
      if (state.currentPosition) {
        state.map.setView([state.currentPosition.lat, state.currentPosition.lng], CONFIG.LOCATION_ZOOM, { animate: true });
      }
    });

    // Retry GPS on badge click
    DOM.trackingBadge.addEventListener('click', () => {
      const currentText = DOM.trackingBadge.textContent || '';
      if (currentText.includes('Timeout') || currentText.includes('indisponibil') || currentText.includes('refuzat') || currentText.includes('Eroare')) {
        window.App.showToast('Se reîncearcă localizarea...', 'info');

        if (state.watchId !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(state.watchId);
        }
        window.App.startGPS();
      }
    });

    // My name
    DOM.myNameInput.addEventListener('input', (e) => {
      state.myName = e.target.value.trim();
      localStorage.setItem('geotrack-my-name', state.myName);
    });

    // Add friend / My code button
    DOM.btnAddFriend.addEventListener('click', () => {
      window.App.openShareModal();
    });

    DOM.closeFriends.addEventListener('click', () => window.App.switchTab('live'));

    // Share modal
    DOM.closeShareModal.addEventListener('click', window.App.closeShareModal);
    DOM.shareModal.querySelector('.modal-backdrop').addEventListener('click', window.App.closeShareModal);

    DOM.btnCopyLink.addEventListener('click', () => {
      const code = DOM.shareLinkInput.value;
      navigator.clipboard.writeText(code).then(() => {
        DOM.btnCopyLink.classList.add('copied');
        window.App.showToast('Cod copiat!', 'success');
        setTimeout(() => DOM.btnCopyLink.classList.remove('copied'), 2000);
      }).catch(() => {
        DOM.shareLinkInput.select();
        document.execCommand('copy');
        window.App.showToast('Cod copiat!', 'success');
      });
    });

    // P2P Internal Modal Tabs
    DOM.modalTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.modalTabs.forEach(t => t.classList.remove('active'));
        DOM.modalTabContents.forEach(c => c.classList.add('hidden'));

        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.modaltab}`).classList.remove('hidden');
      });
    });

    // Connect to friend
    DOM.btnConnectFriend.addEventListener('click', () => {
      const code = DOM.friendCodeInput.value.trim();
      if (!code) {
        window.App.showToast('Introdu codul prietenului', 'error');
        return;
      }
      window.App.connectToFriend(code);
    });

    // Pause/Resume Sharing
    DOM.btnToggleShare.addEventListener('click', () => {
      state.isSharingPaused = !state.isSharingPaused;

      if (state.isSharingPaused) {
        DOM.btnToggleShare.textContent = 'Reia Partajarea';
        DOM.btnToggleShare.style.background = 'var(--accent-gradient)';
        DOM.btnToggleShare.style.color = 'white';

        DOM.shareStatusDot.classList.remove('pulse');
        DOM.shareStatusDot.style.background = 'var(--warning)';
        DOM.shareStatusText.textContent = 'PAUZĂ — nu se trimit date';
        DOM.shareStatusText.style.color = 'var(--warning)';

        window.App.showToast('Partajarea este întreruptă', 'warning');
      } else {
        DOM.btnToggleShare.textContent = 'Pune Pauză Partajării';
        DOM.btnToggleShare.style.background = 'rgba(239, 68, 68, 0.2)';
        DOM.btnToggleShare.style.color = 'var(--danger)';

        DOM.shareStatusDot.classList.add('pulse');
        DOM.shareStatusDot.style.background = '';
        DOM.shareStatusText.style.color = '';
        window.App.updateViewerCount();

        window.App.showToast('Partajarea a fost reluată', 'success');

        if (state.currentPosition) {
          window.App.sendToPeers({
            type: 'location',
            lat: state.currentPosition.lat,
            lng: state.currentPosition.lng
          });
        }
      }
    });

    // Bottom nav
    DOM.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        window.App.switchTab(tab);
      });
    });

    DOM.closeTimeline.addEventListener('click', () => window.App.switchTab('live'));

    // Timeline slider
    DOM.timelineSlider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.value);
      if (state.timelinePoints[idx]) {
        DOM.sliderCurrentTime.textContent = window.App.formatTime(new Date(state.timelinePoints[idx].timestamp));
        window.App.drawTimelineRoute(state.timelinePoints, idx);
      }
    });

    // Timeline actions
    DOM.btnExport.addEventListener('click', () => {
      if (state.timelinePoints.length === 0) {
        window.App.showToast('Nu sunt date de exportat', 'error');
        return;
      }
      TimelineStore.exportGPX(state.timelinePoints, state.selectedDate);
      window.App.showToast('Fișier GPX descărcat!', 'success');
    });

    DOM.btnDeleteDay.addEventListener('click', async () => {
      if (state.timelinePoints.length === 0) return;
      if (confirm(`Ștergi datele din ${state.selectedDate}?`)) {
        await TimelineStore.deletePointsByDate(state.selectedDate);
        window.App.showToast('Date șterse', 'info');
        window.App.loadTimeline(state.selectedDate);
        window.App.buildDateStrip();
      }
    });
  }

  window.App.initEventListeners = initEventListeners;
})();
