'use strict';

const RouteSpecification = require('../domain/model/cargo/RouteSpecification');

/**
 * Booking application service — async top-level independent functions.
 * All repo/factory callbacks are async; this layer awaits them.
 */

async function bookNewCargo(createCargo, storeCargo, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const cargo = await createCargo(originUnLocode, destinationUnLocode, arrivalDeadline);
  await storeCargo(cargo);
  console.info(`Booked new cargo with tracking id ${cargo.trackingId().idString()}`);
  return cargo.trackingId();
}

async function requestPossibleRoutesForCargo(findCargo, fetchRoutes, trackingId) {
  const cargo = await findCargo(trackingId);
  if (!cargo) return [];
  return fetchRoutes(cargo.routeSpecification());
}

async function assignCargoToRoute(findCargo, storeCargo, itinerary, trackingId) {
  const cargo = await findCargo(trackingId);
  if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingId}`);
  cargo.assignToRoute(itinerary);
  await storeCargo(cargo);
  console.info(`Assigned cargo ${trackingId} to new route`);
}

async function changeDestination(findCargo, findLocation, storeCargo, trackingId, unLocode) {
  const [cargo, newDestination] = await Promise.all([
    findCargo(trackingId),
    findLocation(unLocode),
  ]);
  const routeSpec = RouteSpecification(
    cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
  );
  cargo.specifyNewRoute(routeSpec);
  await storeCargo(cargo);
  console.info(`Changed destination for cargo ${trackingId} to ${routeSpec.destination()}`);
}

module.exports = { bookNewCargo, requestPossibleRoutesForCargo, assignCargoToRoute, changeDestination };
