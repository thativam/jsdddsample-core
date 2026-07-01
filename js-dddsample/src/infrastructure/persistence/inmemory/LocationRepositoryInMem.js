'use strict';

const SampleLocations = require('../../sampledata/SampleLocations');

/**
 * In-memory Location repository seeded with sample locations.
 */
function LocationRepositoryInMem() {
  const _store = new Map();
  for (const loc of SampleLocations.getAll()) {
    _store.set(loc.unLocode().idString(), loc);
  }

  function find(unLocode) {
    return _store.get(unLocode.idString()) || null;
  }

  function getAll() {
    return [..._store.values()];
  }

  function store(location) {
    _store.set(location.unLocode().idString(), location);
  }

  return { find, getAll, store };
}

module.exports = LocationRepositoryInMem;
