'use strict';

const RouteSpecification = require('../domain/model/cargo/RouteSpecification');
const TrackingId = require('../domain/model/cargo/TrackingId');
const UnLocode = require('../domain/model/location/UnLocode');

/**
 * Booking application service.
 */
class BookingService {
  /**
   * @param {import('../domain/model/cargo/CargoRepository')} cargoRepository
   * @param {import('../domain/model/location/LocationRepository')} locationRepository
   * @param {import('../domain/service/RoutingService')} routingService
   * @param {import('../domain/model/cargo/CargoFactory')} cargoFactory
   */
  constructor(cargoRepository, locationRepository, routingService, cargoFactory) {
    this._cargoRepository = cargoRepository;
    this._locationRepository = locationRepository;
    this._routingService = routingService;
    this._cargoFactory = cargoFactory;
  }

  /**
   * Book a new cargo.
   * @param {UnLocode} originUnLocode
   * @param {UnLocode} destinationUnLocode
   * @param {Date} arrivalDeadline
   * @returns {TrackingId}
   */
  bookNewCargo(originUnLocode, destinationUnLocode, arrivalDeadline) {
    const cargo = this._cargoFactory.createCargo(originUnLocode, destinationUnLocode, arrivalDeadline);
    this._cargoRepository.store(cargo);
    console.info(`Booked new cargo with tracking id ${cargo.trackingId().idString()}`);
    return cargo.trackingId();
  }

  /**
   * Request possible routes for a cargo.
   * @param {TrackingId} trackingId
   * @returns {import('../domain/model/cargo/Itinerary')[]}
   */
  requestPossibleRoutesForCargo(trackingId) {
    const cargo = this._cargoRepository.find(trackingId);
    if (!cargo) return [];
    return this._routingService.fetchRoutesForSpecification(cargo.routeSpecification());
  }

  /**
   * Assign cargo to a route.
   * @param {import('../domain/model/cargo/Itinerary')} itinerary
   * @param {TrackingId} trackingId
   */
  assignCargoToRoute(itinerary, trackingId) {
    const cargo = this._cargoRepository.find(trackingId);
    if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingId}`);
    cargo.assignToRoute(itinerary);
    this._cargoRepository.store(cargo);
    console.info(`Assigned cargo ${trackingId} to new route`);
  }

  /**
   * Change the destination of a cargo.
   * @param {TrackingId} trackingId
   * @param {UnLocode} unLocode
   */
  changeDestination(trackingId, unLocode) {
    const cargo = this._cargoRepository.find(trackingId);
    const newDestination = this._locationRepository.find(unLocode);
    const routeSpec = new RouteSpecification(
      cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
    );
    cargo.specifyNewRoute(routeSpec);
    this._cargoRepository.store(cargo);
    console.info(`Changed destination for cargo ${trackingId} to ${routeSpec.destination()}`);
  }
}

module.exports = BookingService;
