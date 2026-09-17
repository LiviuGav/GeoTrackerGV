/**
 * Timeline Module
 * IndexedDB storage, calendar UI, route visualization, and stats.
 * All location data stays 100% local on the device.
 */

const TimelineStore = (function () {
  'use strict';

  const DB_NAME = 'geotrack-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'locations';

  let db = null;

  // IndexedDB Setup

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // CRUD Operations

  /**
   * Save a GPS point to the database.
   * @param {Object} point - { lat, lng, accuracy, speed, altitude, heading, timestamp }
   */
  async function savePoint(point) {
    const database = await openDB();
    const date = new Date(point.timestamp);
    const dateStr = formatDate(date);

    const record = {
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy || null,
      speed: point.speed || null,
      altitude: point.altitude || null,
      heading: point.heading || null,
      timestamp: point.timestamp,
      date: dateStr
    };

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all points for a specific date.
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   * @returns {Promise<Array>} Array of location records
   */
  async function getPointsByDate(dateStr) {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('date');
      const request = index.getAll(dateStr);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all dates that have recorded data.
   * @returns {Promise<Array<string>>} Array of date strings
   */
  async function getDatesWithData() {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('date');
      const request = index.openKeyCursor(null, 'nextunique');
      const dates = [];

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          dates.push(cursor.key);
          cursor.continue();
        } else {
          resolve(dates.sort().reverse());
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all points for a specific date.
   * @param {string} dateStr - Date string in YYYY-MM-DD format
   */
  async function deletePointsByDate(dateStr) {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('date');
      const request = index.openCursor(dateStr);

      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Delete ALL location data.
  async function clearAll() {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Count total records.
  async function getTotalCount() {
    const database = await openDB();

    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Statistics
  /**
   * Calculate stats for a set of points.
   * @param {Array} points - Array of location records
   * @returns {Object} { distance, duration, avgSpeed, pointCount, startTime, endTime }
   */
  function calculateStats(points) {
    if (!points || points.length === 0) {
      return {
        distance: 0,
        duration: 0,
        avgSpeed: 0,
        maxSpeed: 0,
        pointCount: 0,
        startTime: null,
        endTime: null
      };
    }

    const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
    let totalDistance = 0;
    let maxSpeed = 0;

    for (let i = 1; i < sorted.length; i++) {
      const dist = haversineDistance(
        sorted[i - 1].lat, sorted[i - 1].lng,
        sorted[i].lat, sorted[i].lng
      );
      totalDistance += dist;

      if (sorted[i].speed !== null && sorted[i].speed > maxSpeed) {
        maxSpeed = sorted[i].speed;
      }
    }

    const startTime = sorted[0].timestamp;
    const endTime = sorted[sorted.length - 1].timestamp;
    const duration = (endTime - startTime) / 1000; // seconds
    const avgSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 3600) : 0; // km/h

    return {
      distance: totalDistance, // meters
      duration: duration, // seconds
      avgSpeed: avgSpeed, // km/h
      maxSpeed: maxSpeed * 3.6, // m/s to km/h
      pointCount: sorted.length,
      startTime,
      endTime
    };
  }

  // GPX Export
  /**
   * Export points as GPX file.
   * @param {Array} points - Array of location records
   * @param {string} dateStr - Date string for the filename
   */
  function exportGPX(points, dateStr) {
    if (!points || points.length === 0) return;

    const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GeoTrack" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>GeoTrack - ${dateStr}</name>
    <time>${new Date(sorted[0].timestamp).toISOString()}</time>
  </metadata>
  <trk>
    <name>Track ${dateStr}</name>
    <trkseg>
`;

    for (const p of sorted) {
      gpx += `      <trkpt lat="${p.lat}" lon="${p.lng}">\n`;
      if (p.altitude !== null) {
        gpx += `        <ele>${p.altitude}</ele>\n`;
      }
      gpx += `        <time>${new Date(p.timestamp).toISOString()}</time>\n`;
      if (p.speed !== null) {
        gpx += `        <speed>${p.speed}</speed>\n`;
      }
      gpx += `      </trkpt>\n`;
    }

    gpx += `    </trkseg>
  </trk>
</gpx>`;

    // Trigger download
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `geotrack-${dateStr}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Utilities

  // Haversine distance
  function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg) {
    return deg * (Math.PI / 180);
  }

  // Format Date to YYYY-MM-DD
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format seconds
  function formatDuration(seconds) {
    if (seconds < 60) return Math.round(seconds) + ' sec';
    if (seconds < 3600) return Math.round(seconds / 60) + ' min';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  }

  // Format meters to km or m.
  function formatDistance(meters) {
    if (meters < 1000) return Math.round(meters) + ' m';
    return (meters / 1000).toFixed(1) + ' km';
  }

  // Get today's date string
  function today() {
    return formatDate(new Date());
  }

  // Public API

  return {
    openDB,
    savePoint,
    getPointsByDate,
    getDatesWithData,
    deletePointsByDate,
    clearAll,
    getTotalCount,
    calculateStats,
    exportGPX,
    haversineDistance,
    formatDate,
    formatDuration,
    formatDistance,
    today
  };

})();
