'use strict';

const { randomUUID } = require('crypto');
const TrackingId = require('../../../domain/model/cargo/TrackingId');

/**
 * In-memory Cargo repository.
 */
function CargoRepositoryInMem() {
  const _store = new Map();

  function find(trackingId) {
    return _store.get(trackingId.idString()) || null;
  }

  function store(cargo) {
    _store.set(cargo.trackingId().idString(), cargo);
  }

  function getAll() {
    return [..._store.values()];
  }

  function nextTrackingId() {
    return TrackingId(randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase());
  }

  return { find, store, getAll, nextTrackingId };
}

module.exports = CargoRepositoryInMem;
