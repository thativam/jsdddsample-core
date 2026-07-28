import { randomUUID } from 'crypto';
import TrackingId  from '../../../domain/model/cargo/TrackingId.js';
import * as CargoMapper from './mappers/CargoMapper.js';

function CargoRepositoryMongo(collection, findLocation, findVoyage, lookupHandlingHistoryOfCargo) {
  async function find(trackingId) {
    const doc = await collection.findOne({ _id: trackingId.idString() });
    if (!doc) return null;
    const cargo   = await CargoMapper.toDomain(doc, findLocation, findVoyage);
    const history = await lookupHandlingHistoryOfCargo(trackingId);
    cargo.deriveDeliveryProgress(history);
    return cargo;
  }

  async function store(cargo) {
    const doc = CargoMapper.toDocument(cargo);
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async function getAll() {
    const docs = await collection.find({}).toArray();
    return Promise.all(docs.map(async doc => {
      const cargo   = await CargoMapper.toDomain(doc, findLocation, findVoyage);
      const history = await lookupHandlingHistoryOfCargo(TrackingId(doc._id));
      cargo.deriveDeliveryProgress(history);
      return cargo;
    }));
  }

  async function nextTrackingId() {
    return TrackingId(randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase());
  }

  return { find, store, getAll, nextTrackingId };
}

export default CargoRepositoryMongo;
