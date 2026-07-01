'use strict';

const SampleVoyages = require('../../sampledata/SampleVoyages');

/**
 * In-memory Voyage repository seeded with sample voyages.
 */
function VoyageRepositoryInMem() {
  const _store = new Map();
  for (const v of SampleVoyages.getAll()) {
    _store.set(v.voyageNumber().idString(), v);
  }

  function find(voyageNumber) {
    return _store.get(voyageNumber.idString()) || null;
  }

  function store(voyage) {
    _store.set(voyage.voyageNumber().idString(), voyage);
  }

  return { find, store };
}

module.exports = VoyageRepositoryInMem;
