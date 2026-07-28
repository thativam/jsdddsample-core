import * as SampleLocations from '../../sampledata/SampleLocations.js';

function LocationRepositoryInMem() {
  const _store = new Map();
  for (const loc of SampleLocations.getAll()) {
    _store.set(loc.unLocode().idString(), loc);
  }

  async function find(unLocode) {
    return _store.get(unLocode.idString()) || null;
  }

  async function getAll() {
    return [..._store.values()];
  }

  async function store(location) {
    _store.set(location.unLocode().idString(), location);
  }

  return { find, getAll, store };
}

export default LocationRepositoryInMem;
