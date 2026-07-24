'use strict';

const TrackingId = require('../../domain/model/cargo/TrackingId');
const UnLocode   = require('../../domain/model/location/UnLocode');
const CargoRoutingDTOAssembler       = require('./assembler/CargoRoutingDTOAssembler');
const ItineraryCandidateDTOAssembler = require('./assembler/ItineraryCandidateDTOAssembler');

/**
 * Facade over BookingService for the web/interface layer — all functions async.
 * Each function receives only the individual callbacks it needs.
 */

async function listShippingLocations(getAllLocations) {
  const locations = await getAllLocations();
  return locations.map(loc => ({
    unLocode: loc.unLocode().idString(),
    name: loc.name(),
  }));
}

async function bookNewCargo(bookNewCargoFn, origin, destination, arrivalDeadline) {
  const trackingId = await bookNewCargoFn(
    UnLocode(origin), UnLocode(destination), arrivalDeadline
  );
  return trackingId.idString();
}

async function loadCargoForRouting(findCargo, trackingId) {
  const cargo = await findCargo(TrackingId(trackingId));
  if (!cargo) return null;
  return CargoRoutingDTOAssembler.toDTO(cargo);
}

async function assignCargoToRoute(assignCargoFn, findVoyage, findLocation, trackingIdStr, routeCandidateDTO) {
  const itinerary = await ItineraryCandidateDTOAssembler.fromDTO(routeCandidateDTO, findVoyage, findLocation);
  await assignCargoFn(itinerary, TrackingId(trackingIdStr));
}

async function changeDestination(changeDestFn, trackingId, destinationUnLocode) {
  await changeDestFn(TrackingId(trackingId), UnLocode(destinationUnLocode));
}

async function listAllCargos(getAllCargos) {
  const cargos = await getAllCargos();
  return cargos.map(c => CargoRoutingDTOAssembler.toDTO(c));
}

async function requestPossibleRoutesForCargo(requestRoutesFn, trackingId) {
  const itineraries = await requestRoutesFn(TrackingId(trackingId));
  return itineraries.map(it => ItineraryCandidateDTOAssembler.toDTO(it));
}

module.exports = { listShippingLocations, bookNewCargo, loadCargoForRouting, assignCargoToRoute, changeDestination, listAllCargos, requestPossibleRoutesForCargo };
