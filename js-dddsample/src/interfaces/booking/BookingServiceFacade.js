'use strict';

const TrackingId = require('../../domain/model/cargo/TrackingId');
const UnLocode   = require('../../domain/model/location/UnLocode');
const CargoRoutingDTOAssembler       = require('./assembler/CargoRoutingDTOAssembler');
const ItineraryCandidateDTOAssembler = require('./assembler/ItineraryCandidateDTOAssembler');

/**
 * Facade over BookingService for the web/interface layer.
 * Each function receives only the individual callbacks it needs (no complex objects).
 */

function listShippingLocations(getAllLocations) {
  return getAllLocations().map(loc => ({
    unLocode: loc.unLocode().idString(),
    name: loc.name(),
  }));
}

function bookNewCargo(bookNewCargoFn, origin, destination, arrivalDeadline) {
  const trackingId = bookNewCargoFn(
    UnLocode(origin), UnLocode(destination), arrivalDeadline
  );
  return trackingId.idString();
}

function loadCargoForRouting(findCargo, trackingId) {
  const cargo = findCargo(TrackingId(trackingId));
  if (!cargo) return null;
  return CargoRoutingDTOAssembler.toDTO(cargo);
}

function assignCargoToRoute(assignCargoFn, findVoyage, findLocation, trackingIdStr, routeCandidateDTO) {
  const itinerary = ItineraryCandidateDTOAssembler.fromDTO(routeCandidateDTO, findVoyage, findLocation);
  assignCargoFn(itinerary, TrackingId(trackingIdStr));
}

function changeDestination(changeDestFn, trackingId, destinationUnLocode) {
  changeDestFn(TrackingId(trackingId), UnLocode(destinationUnLocode));
}

function listAllCargos(getAllCargos) {
  return getAllCargos().map(c => CargoRoutingDTOAssembler.toDTO(c));
}

function requestPossibleRoutesForCargo(requestRoutesFn, trackingId) {
  const itineraries = requestRoutesFn(TrackingId(trackingId));
  return itineraries.map(it => ItineraryCandidateDTOAssembler.toDTO(it));
}

module.exports = { listShippingLocations, bookNewCargo, loadCargoForRouting, assignCargoToRoute, changeDestination, listAllCargos, requestPossibleRoutesForCargo };
