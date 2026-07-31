import RouteSpecification from '../domain/model/cargo/RouteSpecification.js';
import CargoFactory       from '../domain/model/cargo/CargoFactory.js';
import { cargoRepository, locationRepository, routingService } from '../ServiceContext.js';

async function bookNewCargo(originUnLocode, destinationUnLocode, arrivalDeadline) {
  const cargo = await CargoFactory.createCargo(originUnLocode, destinationUnLocode, arrivalDeadline);
  await cargoRepository.store(cargo);
  console.info(`Booked new cargo with tracking id ${cargo.trackingId().idString()}`);
  return cargo.trackingId();
}

async function requestPossibleRoutesForCargo(trackingId) {
  const cargo = await cargoRepository.find(trackingId);
  if (!cargo) return [];
  return routingService.fetchRoutesForSpecification(cargo.routeSpecification());
}

async function assignCargoToRoute(itinerary, trackingId) {
  const cargo = await cargoRepository.find(trackingId);
  if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingId}`);
  cargo.assignToRoute(itinerary);
  await cargoRepository.store(cargo);
  console.info(`Assigned cargo ${trackingId} to new route`);
}

async function changeDestination(trackingId, unLocode) {
  const [cargo, newDestination] = await Promise.all([
    cargoRepository.find(trackingId),
    locationRepository.find(unLocode),
  ]);
  const routeSpec = RouteSpecification(
    cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
  );
  cargo.specifyNewRoute(routeSpec);
  await cargoRepository.store(cargo);
  console.info(`Changed destination for cargo ${trackingId} to ${routeSpec.destination()}`);
}

export { bookNewCargo, requestPossibleRoutesForCargo, assignCargoToRoute, changeDestination };
