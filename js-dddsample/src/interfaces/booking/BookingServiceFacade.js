'use strict';

const TrackingId = require('../../domain/model/cargo/TrackingId');
const UnLocode   = require('../../domain/model/location/UnLocode');
const CargoRoutingDTOAssembler       = require('./assembler/CargoRoutingDTOAssembler');
const ItineraryCandidateDTOAssembler = require('./assembler/ItineraryCandidateDTOAssembler');

/**
 * Facade over BookingService for the web/interface layer.
 * All functions are top-level; each receives the service/repo objects it needs
 * as explicit first parameters (mirrors Spring constructor injection).
 */

function listShippingLocations(locationRepository) {
  return locationRepository.getAll().map(loc => ({
    unLocode: loc.unLocode().idString(),
    name: loc.name(),
  }));
}

function bookNewCargo(bookingService, origin, destination, arrivalDeadline) {
  const trackingId = bookingService.bookNewCargo(
    UnLocode(origin), UnLocode(destination), arrivalDeadline
  );
  return trackingId.idString();
}

function loadCargoForRouting(cargoRepository, trackingId) {
  const cargo = cargoRepository.find(TrackingId(trackingId));
  if (!cargo) return null;
  return CargoRoutingDTOAssembler.toDTO(cargo);
}

function assignCargoToRoute(bookingService, voyageRepository, locationRepository, trackingIdStr, routeCandidateDTO) {
  const itinerary = ItineraryCandidateDTOAssembler.fromDTO(routeCandidateDTO, voyageRepository, locationRepository);
  bookingService.assignCargoToRoute(itinerary, TrackingId(trackingIdStr));
}

function changeDestination(bookingService, trackingId, destinationUnLocode) {
  bookingService.changeDestination(TrackingId(trackingId), UnLocode(destinationUnLocode));
}

function listAllCargos(cargoRepository) {
  return cargoRepository.getAll().map(c => CargoRoutingDTOAssembler.toDTO(c));
}

function requestPossibleRoutesForCargo(bookingService, trackingId) {
  const itineraries = bookingService.requestPossibleRoutesForCargo(TrackingId(trackingId));
  return itineraries.map(it => ItineraryCandidateDTOAssembler.toDTO(it));
}

module.exports = { listShippingLocations, bookNewCargo, loadCargoForRouting, assignCargoToRoute, changeDestination, listAllCargos, requestPossibleRoutesForCargo };
