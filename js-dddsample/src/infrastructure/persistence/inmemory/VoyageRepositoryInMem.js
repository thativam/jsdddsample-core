'use strict';

const SampleVoyages = require('../../sampledata/SampleVoyages');

/**
 * In-memory Voyage repository seeded with sample voyages.
 */
class VoyageRepositoryInMem {
  constructor() {
    /** @type {Map<string, import('../../../domain/model/voyage/Voyage')>} */
    this._store = new Map();
    for (const v of SampleVoyages.getAll()) {
      this._store.set(v.voyageNumber().idString(), v);
    }
  }

  /**
   * @param {import('../../../domain/model/voyage/VoyageNumber')} voyageNumber
   * @returns {import('../../../domain/model/voyage/Voyage')|null}
   */
  find(voyageNumber) {
    return this._store.get(voyageNumber.idString()) || null;
  }

  /** @param {import('../../../domain/model/voyage/Voyage')} voyage */
  store(voyage) {
    this._store.set(voyage.voyageNumber().idString(), voyage);
  }
}

module.exports = VoyageRepositoryInMem;
