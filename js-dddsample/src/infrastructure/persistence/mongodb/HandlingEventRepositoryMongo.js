import HandlingHistory     from '../../../domain/model/handling/HandlingHistory.js';
import * as HandlingEventMapper from './mappers/HandlingEventMapper.js';

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

export default HandlingEventRepositoryMongo;
