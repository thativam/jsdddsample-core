'use strict';

const Cargo = require('./Cargo');
const RouteSpecification = require('./RouteSpecification');

/**
 * Factory for creating Cargo aggregates.
 */
class CargoFactory {
  /**
   * @param {import('../location/LocationRepository')} locationRepository
   * @param {import('./CargoRepository')} cargoRepository
   */
  constructor(locationRepository, cargoRepository) {
    this._locationRepository = locationRepository;
    this._cargoRepository = cargoRepository;
  }

  /**
   * @param {import('../location/UnLocode')} originUnLocode
   * @param {import('../location/UnLocode')} destinationUnLocode
   * @param {Date} arrivalDeadline
   * @returns {Cargo}
   */
  createCargo(originUnLocode, destinationUnLocode, arrivalDeadline) {
    const trackingId = this._cargoRepository.nextTrackingId();
    const origin = this._locationRepository.find(originUnLocode);
    const destination = this._locationRepository.find(destinationUnLocode);
    const routeSpec = new RouteSpecification(origin, destination, arrivalDeadline);
    return new Cargo(trackingId, routeSpec);
  }
}

module.exports = CargoFactory;
