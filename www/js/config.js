/**
 * Config, State & DOM References
 * Loaded first. Exposes window.App for all the other modules
 */
(function () {
  'use strict';

  const CONFIG = {
    TILES: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    TILE_ATTR: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    DEFAULT_CENTER: [44.4268, 26.1025],
    DEFAULT_ZOOM: 13,
    LOCATION_ZOOM: 16,
    SAVE_INTERVAL_MS: 15000,
    MIN_DISTANCE_M: 20,
    MAX_ACCURACY_M: 50,
    SHARE_UPDATE_MS: 2000
  };

  const state = {
    currentPosition: null,
    watchId: null,
    lastSaveTime: 0,
    lastSavePosition: null,

    map: null,
    userMarker: null,
    accuracyCircle: null,
    timelinePolyline: null,
    timelineMarkers: [],

    myName: localStorage.getItem('geotrack-my-name') || '',
    savedFriends: JSON.parse(localStorage.getItem('geotrack-friends') || '[]'),
    friendMarkers: {},
    friendConns: {},

    peer: null,
    peerId: null,
    connections: [],
    shareIntervalId: null,
    wakeLock: null,
    isSharingPaused: false,

    selectedDate: TimelineStore.today(),
    timelinePoints: [],
    activeTab: 'live'
  };

  const DOM = {
    trackingBadge: document.getElementById('tracking-badge'),
    liveBanner: document.getElementById('live-banner'),
    viewerCount: document.getElementById('viewer-count'),

    btnMyLocation: document.getElementById('btn-my-location'),

    bottomNav: document.getElementById('bottom-nav'),
    navItems: document.querySelectorAll('.nav-item'),

    timelinePanel: document.getElementById('timeline-panel'),
    closeTimeline: document.getElementById('close-timeline'),

    friendsPanel: document.getElementById('friends-panel'),
    closeFriends: document.getElementById('close-friends'),
    friendsList: document.getElementById('friends-list'),
    btnAddFriend: document.getElementById('btn-add-friend'),
    myNameInput: document.getElementById('my-name-input'),

    dateStrip: document.getElementById('date-strip'),
    statPoints: document.getElementById('stat-points'),
    statDistance: document.getElementById('stat-distance'),
    statDuration: document.getElementById('stat-duration'),
    statSpeed: document.getElementById('stat-speed'),
    timelineSliderContainer: document.getElementById('timeline-slider-container'),
    timelineSlider: document.getElementById('timeline-slider'),
    sliderStartTime: document.getElementById('slider-start-time'),
    sliderCurrentTime: document.getElementById('slider-current-time'),
    sliderEndTime: document.getElementById('slider-end-time'),
    timelineEntries: document.getElementById('timeline-entries'),
    btnExport: document.getElementById('btn-export'),
    btnDeleteDay: document.getElementById('btn-delete-day'),

    shareModal: document.getElementById('share-modal'),
    closeShareModal: document.getElementById('close-share-modal'),
    shareLinkInput: document.getElementById('share-link-input'),
    btnCopyLink: document.getElementById('btn-copy-link'),
    shareStatusText: document.getElementById('share-status-text'),
    shareStatusDot: document.getElementById('share-status-dot'),
    btnToggleShare: document.getElementById('btn-toggle-share'),

    modalTabs: document.querySelectorAll('.modal-tab'),
    modalTabContents: document.querySelectorAll('.modal-tab-content'),
    friendCodeInput: document.getElementById('friend-code-input'),
    btnConnectFriend: document.getElementById('btn-connect-friend'),

    toastContainer: document.getElementById('toast-container')
  };

  const badgeDot = DOM.trackingBadge.querySelector('.badge-dot');
  const badgeText = DOM.trackingBadge.querySelector('.badge-text');

  // Expose globally for all modules
  window.App = { CONFIG, state, DOM, badgeDot, badgeText };
})();
