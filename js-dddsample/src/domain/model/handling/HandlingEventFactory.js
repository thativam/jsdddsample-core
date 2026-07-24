'use strict';

const HandlingEvent = require('./HandlingEvent');
const {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} = require('./exceptions');

/**
 * Factory for creating HandlingEvent aggregates — all top-level async functions.
 * Each helper receives only the individual lookup callback it needs (no repo objects).
 *
 *   cargoFindFn    = cargoRepository.find     (async)
 *   voyageFindFn   = voyageRepository.find    (async)
 *   locationFindFn = locationRepository.find  (async)
 */

async function findCargo(cargoFindFn, trackingId) {
  const cargo = await cargoFindFn(trackingId);
  if (!cargo) throw new UnknownCargoException(trackingId);
  return cargo;
}

async function findVoyage(voyageFindFn, voyageNumber) {
  if (!voyageNumber) return null;
  const voyage = await voyageFindFn(voyageNumber);
  if (!voyage) throw new UnknownVoyageException(voyageNumber);
  return voyage;
}

async function findLocation(locationFindFn, unlocode) {
  const location = await locationFindFn(unlocode);
  if (!location) throw new UnknownLocationException(unlocode);
  return location;
}

async function createHandlingEvent(cargoFindFn, voyageFindFn, locationFindFn, registrationTime, completionTime, trackingId, voyageNumber, unlocode, type) {
  try {
    const [cargo, voyage, location] = await Promise.all([
      findCargo(cargoFindFn, trackingId),
      findVoyage(voyageFindFn, voyageNumber),
      findLocation(locationFindFn, unlocode),
    ]);
    return HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
  } catch (e) {
    throw new CannotCreateHandlingEventException(e);
  }
}

module.exports = { createHandlingEvent };
