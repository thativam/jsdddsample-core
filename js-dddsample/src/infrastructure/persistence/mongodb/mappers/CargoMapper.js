import Cargo              from '../../../../domain/model/cargo/Cargo.js';
import TrackingId         from '../../../../domain/model/cargo/TrackingId.js';
import RouteSpecification from '../../../../domain/model/cargo/RouteSpecification.js';
import Itinerary          from '../../../../domain/model/cargo/Itinerary.js';
import Leg                from '../../../../domain/model/cargo/Leg.js';
import UnLocode           from '../../../../domain/model/location/UnLocode.js';
import VoyageNumber       from '../../../../domain/model/voyage/VoyageNumber.js';

function toDocument(cargo) {
  const itinerary = cargo.itinerary();
  return {
    _id:        cargo.trackingId().idString(),
    originCode: cargo.origin().unLocode().idString(),
    routeSpec: {
      originCode: cargo.routeSpecification().origin().unLocode().idString(),
      destCode:   cargo.routeSpecification().destination().unLocode().idString(),
      deadline:   cargo.routeSpecification().arrivalDeadline(),
    },
    itinerary: itinerary ? {
      legs: itinerary.legs().map(leg => ({
        voyageNumber: leg.voyage().voyageNumber().idString(),
        from:         leg.loadLocation().unLocode().idString(),
        to:           leg.unloadLocation().unLocode().idString(),
        loadTime:     leg.loadTime(),
        unloadTime:   leg.unloadTime(),
      })),
    } : null,
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
