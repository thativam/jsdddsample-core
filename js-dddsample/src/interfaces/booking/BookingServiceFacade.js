'use strict';

const TrackingId = require('../../domain/model/cargo/TrackingId');
const UnLocode = require('../../domain/model/location/UnLocode');
const CargoRoutingDTOAssembler = require('./assembler/CargoRoutingDTOAssembler');
const ItineraryCandidateDTOAssembler = require('./assembler/ItineraryCandidateDTOAssembler');

/**
 * Facade over the booking application service.
 * Converts between DTOs and domain objects.
 */
class BookingServiceFacade {
  constructor(bookingService, locationRepository, cargoRepository, voyageRepository) {
    this._bookingService = bookingService;
    this._locationRepository = locationRepository;
    this._cargoRepository = cargoRepository;
    this._voyageRepository = voyageRepository;
    this._cargoAssembler = new CargoRoutingDTOAssembler();
    this._itineraryAssembler = new ItineraryCandidateDTOAssembler();
  }

  listShippingLocations() {
    return this._locationRepository.getAll().map(loc => ({
      unLocode: loc.unLocode().idString(),
      name: loc.name(),
    }));
  }

  /**
   * @param {string} origin
   * @param {string} destination
   * @param {Date} arrivalDeadline
   * @returns {string} tracking ID
   */
  bookNewCargo(origin, destination, arrivalDeadline) {
    const trackingId = this._bookingService.bookNewCargo(
      new UnLocode(origin),
      new UnLocode(destination),
      arrivalDeadline
    );
    return trackingId.idString();
  }

  /**
   * @param {string} trackingId
   * @returns {object} CargoRoutingDTO
   */
  loadCargoForRouting(trackingId) {
    const cargo = this._cargoRepository.find(new TrackingId(trackingId));
    if (!cargo) return null;
    return this._cargoAssembler.toDTO(cargo);
  }

  /**
   * @param {string} trackingIdStr
   * @param {object} routeCandidateDTO
   */
  assignCargoToRoute(trackingIdStr, routeCandidateDTO) {
    const itinerary = this._itineraryAssembler.fromDTO(
      routeCandidateDTO, this._voyageRepository, this._locationRepository
    );
    this._bookingService.assignCargoToRoute(itinerary, new TrackingId(trackingIdStr));
  }

  /**
   * @param {string} trackingId
   * @param {string} destinationUnLocode
   */
  changeDestination(trackingId, destinationUnLocode) {
    this._bookingService.changeDestination(new TrackingId(trackingId), new UnLocode(destinationUnLocode));
  }

  /** @returns {object[]} CargoRoutingDTO[] */
  listAllCargos() {
    return this._cargoRepository.getAll().map(c => this._cargoAssembler.toDTO(c));
  }

  /**
   * @param {string} trackingId
   * @returns {object[]} RouteCandidateDTO[]
   */
  requestPossibleRoutesForCargo(trackingId) {
    const itineraries = this._bookingService.requestPossibleRoutesForCargo(new TrackingId(trackingId));
    return itineraries.map(it => this._itineraryAssembler.toDTO(it));
  }
}

module.exports = BookingServiceFacade;
