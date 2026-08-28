import HandlingEvent     from '../../../../domain/model/handling/HandlingEvent.js';
import HandlingEventType from '../../../../domain/model/handling/HandlingEventType.js';
import TrackingId        from '../../../../domain/model/cargo/TrackingId.js';
import UnLocode          from '../../../../domain/model/location/UnLocode.js';
import VoyageNumber      from '../../../../domain/model/voyage/VoyageNumber.js';

function toDocument(cargoTrackingId, typeName, locationCode, voyageNumber, completionTime, registrationTime) {
  return { cargoTrackingId, type: typeName, locationCode, voyageNumber, completionTime, registrationTime };
}

async function toDomain(doc, findCargo, findLocation, findVoyage) {
  if (!doc) return null;
  const type = HandlingEventType[doc.type];
  const [cargo, location, voyage] = await Promise.all([
    findCargo(TrackingId(doc.cargoTrackingId)),
    findLocation(UnLocode(doc.locationCode)),
    doc.voyageNumber ? findVoyage(VoyageNumber(doc.voyageNumber)) : Promise.resolve(null),
  ]);
  return HandlingEvent(cargo, new Date(doc.completionTime), new Date(doc.registrationTime), type, location, voyage || undefined);
}

export { toDocument, toDomain };
