'use strict';

const SampleVoyages = require('../../sampledata/SampleVoyages');

/**
 * In-memory Voyage repository — implements VoyageRepository port (async).
 * Pre-seeded with sample voyages.
 */
function VoyageRepositoryInMem() {
  const _store = new Map();
  for (const v of SampleVoyages.getAll()) {
    _store.set(v.voyageNumber().idString(), v);
  }

  async function find(voyageNumber) {
    return _store.get(voyageNumber.idString()) || null;
  }

  async function store(voyage) {
    _store.set(voyage.voyageNumber().idString(), voyage);
  }

  return { find, store };
}

module.exports = VoyageRepositoryInMem;
