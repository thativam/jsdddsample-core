'use strict';

const { randomUUID } = require('crypto');
const TrackingId = require('../../../domain/model/cargo/TrackingId');

/**
 * In-memory Cargo repository (for tests and sample data).
 */
class CargoRepositoryInMem {
  constructor() {
    /** @type {Map<string, import('../../../domain/model/cargo/Cargo')>} */
    this._store = new Map();
  }

  /**
   * @param {import('../../../domain/model/cargo/TrackingId')} trackingId
   * @returns {import('../../../domain/model/cargo/Cargo')|null}
   */
  find(trackingId) {
    return this._store.get(trackingId.idString()) || null;
  }

  /**
   * @param {import('../../../domain/model/cargo/Cargo')} cargo
   */
  store(cargo) {
    this._store.set(cargo.trackingId().idString(), cargo);
  }

  /**
   * @returns {import('../../../domain/model/cargo/Cargo')[]}
   */
  getAll() {
    return [...this._store.values()];
  }

  /**
   * @returns {TrackingId}
   */
  nextTrackingId() {
    return new TrackingId(randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase());
  }
}

module.exports = CargoRepositoryInMem;
