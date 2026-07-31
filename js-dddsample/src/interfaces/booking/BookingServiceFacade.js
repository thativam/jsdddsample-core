import TrackingId from '../../domain/model/cargo/TrackingId.js';
import UnLocode   from '../../domain/model/location/UnLocode.js';
import { cargoRepository, locationRepository } from '../../ServiceContext.js';
import { toDTO as cargoToDTO }                           from './assembler/CargoRoutingDTOAssembler.js';
import { toDTO as itinToDTO, fromDTO as itinFromDTO }   from './assembler/ItineraryCandidateDTOAssembler.js';
import * as BookingService from '../../application/BookingService.js';

async function listShippingLocations() {
  const locations = await locationRepository.getAll();
  return locations.map(loc => ({
    unLocode: loc.unLocode().idString(),
    name:     loc.name(),
  }));
}

async function bookNewCargo(origin, destination, arrivalDeadline) {
  const trackingId = await BookingService.bookNewCargo(
    UnLocode(origin), UnLocode(destination), arrivalDeadline
  );
  return trackingId.idString();
}

async function loadCargoForRouting(trackingId) {
  const cargo = await cargoRepository.find(TrackingId(trackingId));
  if (!cargo) return null;
  return cargoToDTO(cargo);
}

async function assignCargoToRoute(trackingIdStr, routeCandidateDTO) {
  const itinerary = await itinFromDTO(routeCandidateDTO);
  await BookingService.assignCargoToRoute(itinerary, TrackingId(trackingIdStr));
}

async function changeDestination(trackingId, destinationUnLocode) {
  await BookingService.changeDestination(TrackingId(trackingId), UnLocode(destinationUnLocode));
}

async function listAllCargos() {
  const cargos = await cargoRepository.getAll();
  return cargos.map(c => cargoToDTO(c));
}

async function requestPossibleRoutesForCargo(trackingId) {
  const itineraries = await BookingService.requestPossibleRoutesForCargo(TrackingId(trackingId));
  return itineraries.map(it => itinToDTO(it));
}

export {
  listShippingLocations,
  bookNewCargo,
  loadCargoForRouting,
  assignCargoToRoute,
  changeDestination,
  listAllCargos,
  requestPossibleRoutesForCargo,
};
