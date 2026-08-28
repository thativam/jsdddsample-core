import HandlingHistory     from '../../../domain/model/handling/HandlingHistory.js';
import * as HandlingEventMapper from './mappers/HandlingEventMapper.js';

function HandlingEventRepositoryMongo(collection, findCargo, findLocation, findVoyage) {
  async function store(event) {
    const voyageId = event.voyage() && event.voyage().voyageNumber().idString() !== ''
      ? event.voyage().voyageNumber().idString()
      : null;
    const doc = HandlingEventMapper.toDocument(
      event.cargo().trackingId().idString(),
      event.type().name,
      event.location().unLocode().idString(),
      voyageId,
      event.completionTime(),
      event.registrationTime(),
    );
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
