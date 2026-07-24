'use strict';

const Voyage          = require('../../../../domain/model/voyage/Voyage');
const VoyageNumber    = require('../../../../domain/model/voyage/VoyageNumber');
const Schedule        = require('../../../../domain/model/voyage/Schedule');
const CarrierMovement = require('../../../../domain/model/voyage/CarrierMovement');
const Location        = require('../../../../domain/model/location/Location');
const UnLocode        = require('../../../../domain/model/location/UnLocode');

/**
 * Converts between Voyage domain object and MongoDB document.
 *
 * Document shape:
 * {
 *   _id: "V100",
 *   carrierMovements: [
 *     { fromCode: "CNHKG", toCode: "USNYC", departureTime: ISODate, arrivalTime: ISODate }
 *   ]
 * }
 *
 * Note: carrier movement locations are referenced by UnLocode code.
 * toDomain requires findLocation callback to reconstruct Location objects.
 */

function toDocument(voyage) {
  return {
    _id: voyage.voyageNumber().idString(),
    carrierMovements: voyage.schedule().carrierMovements().map(cm => ({
      fromCode:      cm.departureLocation().unLocode().idString(),
      toCode:        cm.arrivalLocation().unLocode().idString(),
      departureTime: cm.departureTime(),
      arrivalTime:   cm.arrivalTime(),
    })),
  };
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

module.exports = { toDocument, toDomain };
