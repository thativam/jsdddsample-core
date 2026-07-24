'use strict';

const HandlingHistory     = require('../../../domain/model/handling/HandlingHistory');
const HandlingEventMapper = require('./mappers/HandlingEventMapper');

/**
 * MongoDB HandlingEvent repository.
 *
 * @param {import('mongodb').Collection} collection   - db.collection('handlingEvents')
 * @param {Function} findCargo      - async (TrackingId) => Cargo
 * @param {Function} findLocation   - async (UnLocode) => Location
 * @param {Function} findVoyage     - async (VoyageNumber) => Voyage | null
 */
function HandlingEventRepositoryMongo(collection, findCargo, findLocation, findVoyage) {

  async function store(event) {
    const doc = HandlingEventMapper.toDocument(event);
    await collection.insertOne(doc);
  }

  async function lookupHandlingHistoryOfCargo(trackingId) {
    const docs = await collection
      .find({ cargoTrackingId: trackingId.idString() })
      .toArray();

    const events = await Promise.all(
      docs.map(doc => HandlingEventMapper.toDomain(doc, findCargo, findLocation, findVoyage))
    );

    return HandlingHistory(events);
  }

  return { store, lookupHandlingHistoryOfCargo };
}

module.exports = HandlingEventRepositoryMongo;
