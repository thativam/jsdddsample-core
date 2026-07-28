import TrackingId from '../../domain/model/cargo/TrackingId.js';
import UnLocode   from '../../domain/model/location/UnLocode.js';
import { toDTO as cargoToDTO }               from './assembler/CargoRoutingDTOAssembler.js';
import { toDTO as itinToDTO, fromDTO as itinFromDTO } from './assembler/ItineraryCandidateDTOAssembler.js';

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
  return cargoToDTO(cargo);
}

async function assignCargoToRoute(assignCargoFn, findVoyage, findLocation, trackingIdStr, routeCandidateDTO) {
  const itinerary = await itinFromDTO(routeCandidateDTO, findVoyage, findLocation);
  await assignCargoFn(itinerary, TrackingId(trackingIdStr));
}

async function changeDestination(changeDestFn, trackingId, destinationUnLocode) {
  await changeDestFn(TrackingId(trackingId), UnLocode(destinationUnLocode));
}

async function listAllCargos(getAllCargos) {
  const cargos = await getAllCargos();
  return cargos.map(c => cargoToDTO(c));
}

async function requestPossibleRoutesForCargo(requestRoutesFn, trackingId) {
  const itineraries = await requestRoutesFn(TrackingId(trackingId));
  return itineraries.map(it => itinToDTO(it));
}

export { listShippingLocations, bookNewCargo, loadCargoForRouting, assignCargoToRoute, changeDestination, listAllCargos, requestPossibleRoutesForCargo };
