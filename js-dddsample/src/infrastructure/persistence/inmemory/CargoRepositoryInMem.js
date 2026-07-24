'use strict';

const { randomUUID } = require('crypto');
const TrackingId = require('../../../domain/model/cargo/TrackingId');

/**
 * In-memory Cargo repository — implements CargoRepository port (async).
 * All methods return Promises so the application layer is driver-agnostic.
 */
function CargoRepositoryInMem() {
  const _store = new Map();

  async function find(trackingId) {
    return _store.get(trackingId.idString()) || null;
  }

  async function store(cargo) {
    _store.set(cargo.trackingId().idString(), cargo);
  }

  async function getAll() {
    return [..._store.values()];
  }

  async function nextTrackingId() {
    return TrackingId(randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase());
  }

  return { find, store, getAll, nextTrackingId };
}

module.exports = CargoRepositoryInMem;
