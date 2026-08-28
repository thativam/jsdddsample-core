import Cargo              from '../../../../domain/model/cargo/Cargo.js';
import TrackingId         from '../../../../domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../../domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../../../domain/model/cargo/Itinerary.js';
import Leg                from '../../../../domain/model/cargo/Leg.js';
import UnLocode           from '../../../../domain/model/location/UnLocode.js';
import VoyageNumber       from '../../../../domain/model/voyage/VoyageNumber.js';

function toDocument(trackingId, originCode, routeSpecOriginCode, routeSpecDestCode, arrivalDeadline, legs) {
  return {
    _id:        trackingId,
    originCode,
    routeSpec: {
      originCode: routeSpecOriginCode,
      destCode:   routeSpecDestCode,
      deadline:   arrivalDeadline,
    },
    itinerary: legs ? { legs } : null,
  };
}

async function toDomain(doc, findLocation, findVoyage) {
  if (!doc) return null;
  const [origin, destination] = await Promise.all([
    findLocation(UnLocode(doc.routeSpec.originCode)),
    findLocation(UnLocode(doc.routeSpec.destCode)),
  ]);
  const routeSpec = RouteSpecification(origin, destination, new Date(doc.routeSpec.deadline));

  let itinerary = null;
  if (doc.itinerary) {
    const legs = await Promise.all(doc.itinerary.legs.map(async legDoc => {
      const [voyage, loadLoc, unloadLoc] = await Promise.all([
        findVoyage(VoyageNumber(legDoc.voyageNumber)),
        findLocation(UnLocode(legDoc.from)),
        findLocation(UnLocode(legDoc.to)),
      ]);
      return Leg(voyage, loadLoc, unloadLoc, new Date(legDoc.loadTime), new Date(legDoc.unloadTime));
    }));
    itinerary = Itinerary(legs);
  }

  return Cargo(TrackingId(doc._id), routeSpec, itinerary);
}

export { toDocument, toDomain };
