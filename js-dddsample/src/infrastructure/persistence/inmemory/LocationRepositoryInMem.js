'use strict';

const SampleLocations = require('../../sampledata/SampleLocations');

/**
 * In-memory Location repository seeded with sample locations.
 */
class LocationRepositoryInMem {
  constructor() {
    /** @type {Map<string, import('../../../domain/model/location/Location')>} */
    this._store = new Map();
    for (const loc of SampleLocations.getAll()) {
      this._store.set(loc.unLocode().idString(), loc);
    }
  }

  /**
   * @param {import('../../../domain/model/location/UnLocode')} unLocode
   * @returns {import('../../../domain/model/location/Location')|null}
   */
  find(unLocode) {
    return this._store.get(unLocode.idString()) || null;
  }

  /** @returns {import('../../../domain/model/location/Location')[]} */
  getAll() {
    return [...this._store.values()];
  }

  /** @param {import('../../../domain/model/location/Location')} location */
  store(location) {
    this._store.set(location.unLocode().idString(), location);
  }
}

module.exports = LocationRepositoryInMem;
