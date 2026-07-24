'use strict';

const { randomUUID } = require('crypto');
const TrackingId  = require('../../../domain/model/cargo/TrackingId');
const CargoMapper = require('./mappers/CargoMapper');

/**
 * MongoDB Cargo repository.
 *
 * Delivery is NOT stored — it is re-derived from the handling history on every load,
 * matching the Java DDD sample's approach of keeping Delivery as a computed snapshot.
 *
 * @param {import('mongodb').Collection} collection          - db.collection('cargos')
 * @param {Function} findLocation                            - async (UnLocode) => Location
 * @param {Function} findVoyage                              - async (VoyageNumber) => Voyage
 * @param {Function} lookupHandlingHistoryOfCargo            - async (TrackingId) => HandlingHistory
 *   Injected from HandlingEventRepository to reconstruct Delivery state on load.
 */
function CargoRepositoryMongo(collection, findLocation, findVoyage, lookupHandlingHistoryOfCargo) {

  async function find(trackingId) {
    const doc = await collection.findOne({ _id: trackingId.idString() });
    if (!doc) return null;

    const cargo = await CargoMapper.toDomain(doc, findLocation, findVoyage);

    // Re-derive delivery from handling history so the snapshot is always current
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

module.exports = CargoRepositoryMongo;
