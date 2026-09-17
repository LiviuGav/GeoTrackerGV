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

    state.peer.on('connection', (conn) => {
      conn.on('open', () => {
        state.connections.push(conn);
        updateViewerCount();

        if (state.currentPosition) {
          conn.send({
            type: 'location',
            ...state.currentPosition
          });
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
