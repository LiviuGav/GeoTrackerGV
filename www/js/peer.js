/**
 * Peer Module
 * PeerJS connection management, broadcasting, and viewer count.
 */
(function () {
  'use strict';
  const { CONFIG, state, DOM } = window.App;

  function randomId(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function getOrCreatePeerId() {
    let id = localStorage.getItem('geotrack-peer-id');
    if (!id) {
      id = 'geo-' + randomId(8);
      localStorage.setItem('geotrack-peer-id', id);
    }
    return id;
  }

  function buildShareLink() {
    DOM.shareLinkInput.value = state.peerId;
  }

  function startPeer() {
    state.peer = new Peer(state.peerId, {
      debug: 0
    });

    state.peer.on('open', (id) => {
      console.log('Peer ready:', id);
      updateViewerCount();
    });

    function promptConnection(conn) {
      return new Promise((resolve) => {
        const modal = document.getElementById('auth-modal');
        const idEl = document.getElementById('auth-req-id');
        const acceptBtn = document.getElementById('btn-auth-accept');
        const rejectBtn = document.getElementById('btn-auth-reject');

        const reqName = (conn.metadata && conn.metadata.name) ? conn.metadata.name : 'Anonim';
        idEl.textContent = `${reqName} (ID: ${conn.peer})`;
        modal.classList.remove('hidden');

        const cleanup = () => {
          acceptBtn.removeEventListener('click', onAccept);
          rejectBtn.removeEventListener('click', onReject);
          modal.classList.add('hidden');
        };

        const onAccept = () => { cleanup(); resolve(true); };
        const onReject = () => { cleanup(); resolve(false); };

        acceptBtn.addEventListener('click', onAccept);
        rejectBtn.addEventListener('click', onReject);
      });
    }

    function getAllowedPeers() {
      return JSON.parse(localStorage.getItem('geotrack-allowed-peers') || '[]');
    }

    function addAllowedPeer(id) {
      const allowed = getAllowedPeers();
      if (!allowed.includes(id)) {
        allowed.push(id);
        localStorage.setItem('geotrack-allowed-peers', JSON.stringify(allowed));
      }
    }

    state.peer.on('connection', (conn) => {
      conn.on('open', async () => {
        const allowed = getAllowedPeers();
        let accepted = false;

        if (allowed.includes(conn.peer)) {
          accepted = true;
          window.App.showToast('Conexiune auto-acceptată', 'success');
        } else {
          accepted = await promptConnection(conn);
          if (accepted) {
            addAllowedPeer(conn.peer);
            window.App.showToast('Conexiune acceptată', 'success');
          } else {
            window.App.showToast('Cerere respinsă', 'info');
          }
        }

        if (accepted) {
          state.connections.push(conn);
          updateViewerCount();

          if (state.currentPosition) {
            conn.send({
              type: 'location',
              ...state.currentPosition
            });
          }
        } else {
          conn.send({ type: 'rejected' });
          setTimeout(() => conn.close(), 500);
        }
      });

      conn.on('close', () => {
        state.connections = state.connections.filter(c => c !== conn);
        updateViewerCount();
      });

      conn.on('error', () => {
        state.connections = state.connections.filter(c => c !== conn);
        updateViewerCount();
      });
    });

    state.peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        const newId = 'geo-' + randomId(8);
        localStorage.setItem('geotrack-peer-id', newId);
        state.peerId = newId;
        buildShareLink();
        setTimeout(startPeer, 2000);
      } else if (err.type === 'disconnected') {
        setTimeout(() => {
          if (state.peer && !state.peer.destroyed) {
            state.peer.reconnect();
          }
        }, 3000);
      }
    });

    state.peer.on('disconnected', () => {
      setTimeout(() => {
        if (state.peer && !state.peer.destroyed) {
          state.peer.reconnect();
        }
      }, 3000);
    });

    state.shareIntervalId = setInterval(() => {
      if (state.currentPosition && state.connections.length > 0) {
        broadcastLocation(state.currentPosition);
      }
    }, CONFIG.SHARE_UPDATE_MS);
  }

  function broadcastLocation(position) {
    const data = {
      type: 'location',
      name: state.myName,
      lat: position.lat,
      lng: position.lng,
      accuracy: position.accuracy,
      speed: position.speed,
      altitude: position.altitude,
      heading: position.heading,
      timestamp: position.timestamp
    };

    sendToPeers(data);
  }

  function sendToPeers(data) {
    if (state.isSharingPaused && data.type === 'location') return;
    state.connections.forEach(conn => {
      if (conn.open) {
        try { conn.send(data); } catch (e) { }
      }
    });
  }

  function updateViewerCount() {
    const count = state.connections.filter(c => c.open).length;
    if (count > 0) {
      DOM.liveBanner.classList.remove('hidden');
      DOM.viewerCount.textContent = count === 1
        ? '• 1 persoană vede'
        : `• ${count} persoane văd`;
    } else {
      DOM.liveBanner.classList.add('hidden');
    }

    if (!state.isSharingPaused) {
      if (count > 0) {
        DOM.shareStatusText.textContent = `${count} ${count === 1 ? 'persoană conectată' : 'persoane conectate'}`;
      } else {
        DOM.shareStatusText.textContent = 'Activ — locația ta se partajează';
      }
    } else {
      DOM.shareStatusText.textContent = 'Partajare întreruptă';
    }
  }

  window.App.getOrCreatePeerId = getOrCreatePeerId;
  window.App.buildShareLink = buildShareLink;
  window.App.startPeer = startPeer;
  window.App.broadcastLocation = broadcastLocation;
  window.App.sendToPeers = sendToPeers;
  window.App.updateViewerCount = updateViewerCount;
})();
