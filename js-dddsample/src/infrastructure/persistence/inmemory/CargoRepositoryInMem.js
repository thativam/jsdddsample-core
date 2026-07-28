import { randomUUID } from 'crypto';
import TrackingId from '../../../domain/model/cargo/TrackingId.js';

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

export default CargoRepositoryInMem;
