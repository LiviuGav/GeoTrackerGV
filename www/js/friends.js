/**
 * Friends Module
 * P2P tracking, markers and friends list UI.
 */
(function () {
  'use strict';
  const { CONFIG, state, DOM } = window.App;

  function saveFriendsList() {
    localStorage.setItem('geotrack-friends', JSON.stringify(state.savedFriends));
  }

  function addFriendToList(friendId) {
    if (!state.savedFriends.includes(friendId)) {
      state.savedFriends.push(friendId);
      saveFriendsList();
    }
  }

  function removeFriend(friendId) {
    state.savedFriends = state.savedFriends.filter(id => id !== friendId);
    saveFriendsList();
    if (state.friendConns[friendId]) {
      state.friendConns[friendId].close();
      delete state.friendConns[friendId];
    }
    if (state.friendMarkers[friendId]) {
      state.map.removeLayer(state.friendMarkers[friendId]);
      delete state.friendMarkers[friendId];
    }
    renderFriendsList();
  }

  function reconnectSavedFriends() {
    state.savedFriends.forEach(id => connectToFriend(id, true));
  }

  function connectToFriend(friendId, silent = false) {
    if (!state.peer) return;
    if (state.friendConns[friendId]) return;

    if (!silent) window.App.showToast('Se conectează la prieten...', 'info');

    const myName = localStorage.getItem('geotrack-my-name') || 'Anonim';
    const conn = state.peer.connect(friendId, { metadata: { name: myName } });
    state.friendConns[friendId] = conn;

    conn.on('open', () => {
      if (!silent) window.App.showToast('În așteptarea acceptului...', 'info');
      if (!silent) {
        window.App.switchTab('live');
        window.App.closeShareModal();
      }
    });

    conn.on('data', (data) => {
      if (data.type === 'location') {
        if (!state.savedFriends.includes(friendId)) {
          if (!silent) window.App.showToast('Conexiune acceptată!', 'success');
          addFriendToList(friendId);
        }
        updateFriendMarker(friendId, data);
        renderFriendsList();
      } else if (data.type === 'rejected') {
        window.App.showToast('Cererea a fost respinsă de utilizator', 'error');
        removeFriend(friendId);
      }
    });

    conn.on('close', () => {
      if (!silent && state.savedFriends.includes(friendId)) {
        window.App.showToast(`Conexiunea cu ${friendId} s-a închis`, 'warning');
      }
      delete state.friendConns[friendId];
      if (state.friendMarkers[friendId]) {
        state.map.removeLayer(state.friendMarkers[friendId]);
        delete state.friendMarkers[friendId];
      }
      renderFriendsList();
    });

    conn.on('error', () => {
      delete state.friendConns[friendId];
      renderFriendsList();
    });
  }

  function updateFriendMarker(friendId, data) {
    const latlng = [data.lat, data.lng];
    const name = data.name || friendId;
    const speed = data.speed ? Math.round(data.speed * 3.6) : 0;

    const popupContent = `
      <div class="custom-popup-content">
        <div class="popup-name">${name}</div>
        <div class="popup-detail">${speed > 0 ? speed + ' km/h' : 'Staționează'}</div>
        <div class="popup-detail">Acum ${Math.round((Date.now() - data.timestamp) / 1000)}s</div>
      </div>
    `;

    if (!state.friendMarkers[friendId]) {
      const icon = L.divIcon({
        className: 'friend-marker',
        html: '<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(239,68,68,0.8);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      const marker = L.marker(latlng, { icon, zIndexOffset: 1001 }).addTo(state.map);
      marker.bindPopup(popupContent);
      state.friendMarkers[friendId] = marker;
    } else {
      state.friendMarkers[friendId].setLatLng(latlng);
      state.friendMarkers[friendId].setPopupContent(popupContent);
    }
  }

  function renderFriendsList() {
    if (state.savedFriends.length === 0) {
      DOM.friendsList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">Niciun prieten adăugat</div>';
      return;
    }

    DOM.friendsList.innerHTML = state.savedFriends.map(friendId => {
      const conn = state.friendConns[friendId];
      const isOnline = conn && conn.open;
      const marker = state.friendMarkers[friendId];

      let displayName = friendId;
      if (marker && marker._popup && marker._popup._content) {
        const match = marker._popup._content.match(/<div class="popup-name">(.*?)<\/div>/);
        if (match) displayName = match[1];
      }

      return `
        <div class="friend-item" onclick="window.locateFriend('${friendId}')">
          <div class="friend-info">
            <span class="friend-name">${displayName}</span>
            <span class="friend-status">
              <span class="status-dot ${isOnline ? 'online' : ''}"></span>
              ${isOnline ? 'Conectat' : 'Offline'}
            </span>
          </div>
          <div class="friend-actions">
            <button class="btn-icon delete" onclick="event.stopPropagation(); window.deleteFriend('${friendId}')" title="Șterge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.deleteFriend = (friendId) => {
    if (confirm('Sigur vrei să ștergi prietenul?')) {
      removeFriend(friendId);
    }
  };

  window.locateFriend = (friendId) => {
    if (state.friendMarkers[friendId]) {
      document.getElementById('friends-panel').classList.add('hidden');
      state.map.setView(state.friendMarkers[friendId].getLatLng(), CONFIG.LOCATION_ZOOM);
      state.friendMarkers[friendId].openPopup();
    } else {
      window.App.showToast('Prietenul este offline sau nu are locație', 'warning');
    }
  };

  window.App.connectToFriend = connectToFriend;
  window.App.reconnectSavedFriends = reconnectSavedFriends;
  window.App.renderFriendsList = renderFriendsList;
})();
