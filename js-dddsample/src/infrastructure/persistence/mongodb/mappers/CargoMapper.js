'use strict';

const Cargo              = require('../../../../domain/model/cargo/Cargo');
const TrackingId         = require('../../../../domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../../domain/model/cargo/RouteSpecification');
const Itinerary          = require('../../../../domain/model/cargo/Itinerary');
const Leg                = require('../../../../domain/model/cargo/Leg');
const UnLocode           = require('../../../../domain/model/location/UnLocode');
const VoyageNumber       = require('../../../../domain/model/voyage/VoyageNumber');

/**
 * Converts between Cargo aggregate and MongoDB document.
 *
 * Document shape:
 * {
 *   _id: "ABC12345",                 // TrackingId
 *   originCode: "CNHKG",
 *   routeSpec: {
 *     originCode: "CNHKG",
 *     destCode:   "SESTO",
 *     deadline:   ISODate
 *   },
 *   itinerary: {                     // null if not yet routed
 *     legs: [
 *       { voyageNumber: "V100", from: "CNHKG", to: "USNYC",
 *         loadTime: ISODate, unloadTime: ISODate }
 *     ]
 *   }
 * }
 *
 * Delivery is NOT stored — it is re-derived from the handling history on load.
 * CargoRepositoryMongo.find() calls handlingEventRepo.lookupHandlingHistoryOfCargo()
 * and then cargo.deriveDeliveryProgress(history) before returning the cargo.
 */

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

/**
 * @param {object}   doc            - Raw MongoDB document
 * @param {Function} findLocation   - async (UnLocode) => Location
 * @param {Function} findVoyage     - async (VoyageNumber) => Voyage
 * @returns {Promise<Cargo>}
 */
async function toDomain(doc, findLocation, findVoyage) {
  if (!doc) return null;

  // Reconstruct route specification
  const [origin, destination] = await Promise.all([
    findLocation(UnLocode(doc.routeSpec.originCode)),
    findLocation(UnLocode(doc.routeSpec.destCode)),
  ]);
  const routeSpec = RouteSpecification(origin, destination, new Date(doc.routeSpec.deadline));

  // Reconstruct itinerary (if routed)
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

module.exports = { toDocument, toDomain };
