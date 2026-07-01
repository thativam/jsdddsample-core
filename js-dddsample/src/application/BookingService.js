'use strict';

const RouteSpecification = require('../domain/model/cargo/RouteSpecification');

/**
 * Booking application service — top-level independent functions.
 * Dependencies are injected as explicit first parameters (mirrors Spring constructor injection).
 */

function bookNewCargo(cargoRepository, cargoFactory, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const cargo = cargoFactory.createCargo(originUnLocode, destinationUnLocode, arrivalDeadline);
  cargoRepository.store(cargo);
  console.info(`Booked new cargo with tracking id ${cargo.trackingId().idString()}`);
  return cargo.trackingId();
}

function requestPossibleRoutesForCargo(cargoRepository, routingService, trackingId) {
  const cargo = cargoRepository.find(trackingId);
  if (!cargo) return [];
  return routingService.fetchRoutesForSpecification(cargo.routeSpecification());
}

function assignCargoToRoute(cargoRepository, itinerary, trackingId) {
  const cargo = cargoRepository.find(trackingId);
  if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingId}`);
  cargo.assignToRoute(itinerary);
  cargoRepository.store(cargo);
  console.info(`Assigned cargo ${trackingId} to new route`);
}

function changeDestination(cargoRepository, locationRepository, trackingId, unLocode) {
  const cargo = cargoRepository.find(trackingId);
  const newDestination = locationRepository.find(unLocode);
  const routeSpec = RouteSpecification(
    cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
  );
  cargo.specifyNewRoute(routeSpec);
  cargoRepository.store(cargo);
  console.info(`Changed destination for cargo ${trackingId} to ${routeSpec.destination()}`);
}

module.exports = { bookNewCargo, requestPossibleRoutesForCargo, assignCargoToRoute, changeDestination };
