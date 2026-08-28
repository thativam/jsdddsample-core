import Voyage          from '../../../../domain/model/voyage/Voyage.js';
import VoyageNumber    from '../../../../domain/model/voyage/VoyageNumber.js';
import Schedule        from '../../../../domain/model/voyage/Schedule.js';
import CarrierMovement from '../../../../domain/model/voyage/CarrierMovement.js';
import UnLocode        from '../../../../domain/model/location/UnLocode.js';

function toDocument(voyageNumberStr, carrierMovements) {
  return { _id: voyageNumberStr, carrierMovements };
}

async function toDomain(doc, findLocation) {
  if (!doc) return null;
  const movements = await Promise.all(doc.carrierMovements.map(async cm => {
    const [from, to] = await Promise.all([
      findLocation(UnLocode(cm.fromCode)),
      findLocation(UnLocode(cm.toCode)),
    ]);
    return CarrierMovement(from, to, new Date(cm.departureTime), new Date(cm.arrivalTime));
  }));
  return Voyage(VoyageNumber(doc._id), Schedule(movements));
}

export { toDocument, toDomain };
