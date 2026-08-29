import TrackingId from '../../domain/model/cargo/TrackingId.js';
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
  return await BookingService.bookNewCargo(origin, destination, arrivalDeadline);
}

function _extractCargoLegs(cargo) {
  console.log("[BookinServiceCascade] Cargo is ", cargo)
  const itinerary = cargo.itinerary();
  return itinerary ? itinerary.legs().map(leg => ({
    voyageNumber: leg.voyage().voyageNumber().idString(),
    from:         leg.loadLocation().unLocode().idString(),
    to:           leg.unloadLocation().unLocode().idString(),
    loadTime:     leg.loadTime(),
    unloadTime:   leg.unloadTime(),
  })) : [];
}

function _cargoToDTO(cargo) {
  const legs = _extractCargoLegs(cargo);
  return cargoToDTO(
    cargo.trackingId().idString(),
    cargo.origin().unLocode().idString(),
    cargo.routeSpecification().destination().unLocode().idString(),
    cargo.routeSpecification().arrivalDeadline(),
    legs,
    cargo.delivery().routingStatus() === 'MISROUTED',
  );
}

async function loadCargoForRouting(trackingId) {
  const cargo = await cargoRepository.find(TrackingId(trackingId));
  if (!cargo) return null;
  return _cargoToDTO(cargo);
}

async function assignCargoToRoute(trackingIdStr, routeCandidateDTO) {
  const itinerary = await itinFromDTO(routeCandidateDTO);
  await BookingService.assignCargoToRoute(itinerary, trackingIdStr);
}

async function changeDestination(trackingId, destinationUnLocode) {
  await BookingService.changeDestination(trackingId, destinationUnLocode);
}

async function listAllCargos() {
  const cargos = await cargoRepository.getAll();
  return cargos.map(_cargoToDTO);
}

async function requestPossibleRoutesForCargo(trackingId) {
  const itineraries = await BookingService.requestPossibleRoutesForCargo(trackingId);
  return itineraries.map(it => itinToDTO(
    it.legs().map(leg => ({
      voyageNumber: leg.voyage().voyageNumber().idString(),
      from:         leg.loadLocation().unLocode().idString(),
      to:           leg.unloadLocation().unLocode().idString(),
      loadTime:     leg.loadTime(),
      unloadTime:   leg.unloadTime(),
    }))
  ));
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
