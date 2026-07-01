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
 * Repositories are injected as first parameters; helper functions are also top-level
 * and receive their own dependencies as parameters.
 */

function findCargo(cargoRepository, trackingId) {
  const cargo = cargoRepository.find(trackingId);
  if (!cargo) throw new UnknownCargoException(trackingId);
  return cargo;
}

function findVoyage(voyageRepository, voyageNumber) {
  if (!voyageNumber) return null;
  const voyage = voyageRepository.find(voyageNumber);
  if (!voyage) throw new UnknownVoyageException(voyageNumber);
  return voyage;
}

function findLocation(locationRepository, unlocode) {
  const location = locationRepository.find(unlocode);
  if (!location) throw new UnknownLocationException(unlocode);
  return location;
}

function createHandlingEvent(cargoRepository, voyageRepository, locationRepository, registrationTime, completionTime, trackingId, voyageNumber, unlocode, type) {
  try {
    const cargo    = findCargo(cargoRepository, trackingId);
    const voyage   = findVoyage(voyageRepository, voyageNumber);
    const location = findLocation(locationRepository, unlocode);
    return HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
  } catch (e) {
    throw new CannotCreateHandlingEventException(e);
  }
}

module.exports = { createHandlingEvent };
