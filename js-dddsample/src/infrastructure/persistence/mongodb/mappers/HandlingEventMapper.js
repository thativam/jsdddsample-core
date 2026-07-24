'use strict';

const HandlingEvent     = require('../../../../domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../../domain/model/handling/HandlingEventType');
const TrackingId        = require('../../../../domain/model/cargo/TrackingId');
const UnLocode          = require('../../../../domain/model/location/UnLocode');
const VoyageNumber      = require('../../../../domain/model/voyage/VoyageNumber');

/**
 * Converts between HandlingEvent aggregate and MongoDB document.
 *
 * Document shape:
 * {
 *   _id:              ObjectId (auto),
 *   cargoTrackingId:  "ABC12345",
 *   type:             "LOAD",
 *   locationCode:     "CNHKG",
 *   voyageNumber:     "V100" | null,
 *   completionTime:   ISODate,
 *   registrationTime: ISODate
 * }
 *
 * Note: the full Cargo aggregate is NOT embedded — only the trackingId is stored.
 * toDomain requires findCargo, findLocation, findVoyage to reconstruct the object.
 */

function toDocument(event) {
  return {
    cargoTrackingId:  event.cargo().trackingId().idString(),
    type:             event.type().name,
    locationCode:     event.location().unLocode().idString(),
    voyageNumber:     event.voyage() && event.voyage().voyageNumber().idString() !== ''
                        ? event.voyage().voyageNumber().idString()
                        : null,
    completionTime:   event.completionTime(),
    registrationTime: event.registrationTime(),
  };
}

/**
 * @param {object}   doc            - Raw MongoDB document
 * @param {Function} findCargo      - async (TrackingId) => Cargo
 * @param {Function} findLocation   - async (UnLocode) => Location
 * @param {Function} findVoyage     - async (VoyageNumber) => Voyage | null
 * @returns {Promise<HandlingEvent>}
 */
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

module.exports = { toDocument, toDomain };
