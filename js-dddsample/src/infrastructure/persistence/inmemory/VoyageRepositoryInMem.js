import * as SampleVoyages from '../../sampledata/SampleVoyages.js';

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

export default VoyageRepositoryInMem;
