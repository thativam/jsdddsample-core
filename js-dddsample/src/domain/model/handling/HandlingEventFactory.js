'use strict';

const HandlingEvent = require('./HandlingEvent');
const {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} = require('./exceptions');

/**
 * Factory for creating HandlingEvent aggregates — all top-level independent functions.
 * Each helper receives only the individual lookup callback it needs (no repo objects).
 *
 *   cargoFindFn   = cargoRepository.find
 *   voyageFindFn  = voyageRepository.find
 *   locationFindFn = locationRepository.find
 */

function findCargo(cargoFindFn, trackingId) {
  const cargo = cargoFindFn(trackingId);
  if (!cargo) throw new UnknownCargoException(trackingId);
  return cargo;
}

function findVoyage(voyageFindFn, voyageNumber) {
  if (!voyageNumber) return null;
  const voyage = voyageFindFn(voyageNumber);
  if (!voyage) throw new UnknownVoyageException(voyageNumber);
  return voyage;
}

function findLocation(locationFindFn, unlocode) {
  const location = locationFindFn(unlocode);
  if (!location) throw new UnknownLocationException(unlocode);
  return location;
}

function createHandlingEvent(cargoFindFn, voyageFindFn, locationFindFn, registrationTime, completionTime, trackingId, voyageNumber, unlocode, type) {
  try {
    const cargo    = findCargo(cargoFindFn, trackingId);
    const voyage   = findVoyage(voyageFindFn, voyageNumber);
    const location = findLocation(locationFindFn, unlocode);
    return HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
  } catch (e) {
    throw new CannotCreateHandlingEventException(e);
  }
}

module.exports = { createHandlingEvent };
