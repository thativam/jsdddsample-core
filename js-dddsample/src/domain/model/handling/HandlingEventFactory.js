'use strict';

const HandlingEvent = require('./HandlingEvent');
const {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} = require('./exceptions');

/**
 * Creates HandlingEvent aggregates, resolving cargo, voyage and location from repositories.
 */
class HandlingEventFactory {
  /**
   * @param {import('../cargo/CargoRepository')} cargoRepository
   * @param {import('../voyage/VoyageRepository')} voyageRepository
   * @param {import('../location/LocationRepository')} locationRepository
   */
  constructor(cargoRepository, voyageRepository, locationRepository) {
    this._cargoRepository = cargoRepository;
    this._voyageRepository = voyageRepository;
    this._locationRepository = locationRepository;
  }

  /**
   * @param {Date} registrationTime
   * @param {Date} completionTime
   * @param {import('../cargo/TrackingId')} trackingId
   * @param {import('../voyage/VoyageNumber')|null} voyageNumber
   * @param {import('../location/UnLocode')} unlocode
   * @param {{name:string, voyageRequired:boolean}} type
   * @returns {HandlingEvent}
   * @throws {CannotCreateHandlingEventException}
   */
  createHandlingEvent(registrationTime, completionTime, trackingId, voyageNumber, unlocode, type) {
    try {
      const cargo = this._findCargo(trackingId);
      const voyage = this._findVoyage(voyageNumber);
      const location = this._findLocation(unlocode);
      return new HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
    } catch (e) {
      throw new CannotCreateHandlingEventException(e);
    }
  }

  _findCargo(trackingId) {
    const cargo = this._cargoRepository.find(trackingId);
    if (!cargo) throw new UnknownCargoException(trackingId);
    return cargo;
  }

  _findVoyage(voyageNumber) {
    if (!voyageNumber) return null;
    const voyage = this._voyageRepository.find(voyageNumber);
    if (!voyage) throw new UnknownVoyageException(voyageNumber);
    return voyage;
  }

  _findLocation(unlocode) {
    const location = this._locationRepository.find(unlocode);
    if (!location) throw new UnknownLocationException(unlocode);
    return location;
  }
}

module.exports = HandlingEventFactory;
