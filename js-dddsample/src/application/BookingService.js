'use strict';

const RouteSpecification = require('../domain/model/cargo/RouteSpecification');

/**
 * Booking application service — top-level independent functions.
 * Each function receives only the individual callbacks it needs (no complex objects).
 *
 *   Java @Autowired CargoRepository  →  individual findCargo / storeCargo callbacks
 *   Java @Autowired CargoFactory     →  createCargo callback
 *   Java @Autowired RoutingService   →  fetchRoutes callback
 */

function bookNewCargo(createCargo, storeCargo, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const cargo = createCargo(originUnLocode, destinationUnLocode, arrivalDeadline);
  storeCargo(cargo);
  console.info(`Booked new cargo with tracking id ${cargo.trackingId().idString()}`);
  return cargo.trackingId();
}

function requestPossibleRoutesForCargo(findCargo, fetchRoutes, trackingId) {
  const cargo = findCargo(trackingId);
  if (!cargo) return [];
  return fetchRoutes(cargo.routeSpecification());
}

function assignCargoToRoute(findCargo, storeCargo, itinerary, trackingId) {
  const cargo = findCargo(trackingId);
  if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingId}`);
  cargo.assignToRoute(itinerary);
  storeCargo(cargo);
  console.info(`Assigned cargo ${trackingId} to new route`);
}

function changeDestination(findCargo, findLocation, storeCargo, trackingId, unLocode) {
  const cargo = findCargo(trackingId);
  const newDestination = findLocation(unLocode);
  const routeSpec = RouteSpecification(
    cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
  );
  cargo.specifyNewRoute(routeSpec);
  storeCargo(cargo);
  console.info(`Changed destination for cargo ${trackingId} to ${routeSpec.destination()}`);
}

module.exports = { bookNewCargo, requestPossibleRoutesForCargo, assignCargoToRoute, changeDestination };
