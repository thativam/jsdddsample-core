import RouteSpecification from '../domain/model/cargo/RouteSpecification.js';
import CargoFactory       from '../domain/model/cargo/CargoFactory.js';
import TrackingId         from '../domain/model/cargo/TrackingId.js';
import UnLocode           from '../domain/model/location/UnLocode.js';
import { cargoRepository, locationRepository, routingService } from '../ServiceContext.js';

function _cargoStoreArgs(cargo) {
  console.log("[BookingService] Cargo is ", cargo)
  const itinerary = cargo.itinerary();
  return [
    cargo,
    cargo.trackingId().idString(),
    cargo.origin().unLocode().idString(),
    cargo.routeSpecification().origin().unLocode().idString(),
    cargo.routeSpecification().destination().unLocode().idString(),
    cargo.routeSpecification().arrivalDeadline(),
    itinerary ? itinerary.legs().map(leg => ({
      voyageNumber: leg.voyage().voyageNumber().idString(),
      from:         leg.loadLocation().unLocode().idString(),
      to:           leg.unloadLocation().unLocode().idString(),
      loadTime:     leg.loadTime(),
      unloadTime:   leg.unloadTime(),
    })) : null,
  ];
}

/**
 * @param {string} originUnLocodeStr
 * @param {string} destinationUnLocodeStr
 * @param {Date}   arrivalDeadline
 * @returns {TrackingId}
 */
async function bookNewCargo(originUnLocodeStr, destinationUnLocodeStr, arrivalDeadline) {
  const trackingIdStr = await CargoFactory.createCargo(originUnLocodeStr, destinationUnLocodeStr, arrivalDeadline);
  console.info(`Booked new cargo with tracking id ${trackingIdStr}`);
  return trackingIdStr;
}

/**
 * @param {string} trackingIdStr
 */
async function requestPossibleRoutesForCargo(trackingIdStr) {
  const cargo = await cargoRepository.find(TrackingId(trackingIdStr));
  if (!cargo) return [];
  return routingService.fetchRoutesForSpecification(cargo.routeSpecification());
}

/**
 * @param {Itinerary} itinerary
 * @param {string}    trackingIdStr
 */
async function assignCargoToRoute(itinerary, trackingIdStr) {
  const cargo = await cargoRepository.find(TrackingId(trackingIdStr));
  if (!cargo) throw new Error(`Can't assign itinerary to non-existing cargo ${trackingIdStr}`);
  cargo.assignToRoute(itinerary);
  await cargoRepository.store(..._cargoStoreArgs(cargo));
  console.info(`Assigned cargo ${trackingIdStr} to new route`);
}

/**
 * @param {string} trackingIdStr
 * @param {string} unLocodeStr
 */
async function changeDestination(trackingIdStr, unLocodeStr) {
  const [cargo, newDestination] = await Promise.all([
    cargoRepository.find(TrackingId(trackingIdStr)),
    locationRepository.find(UnLocode(unLocodeStr)),
  ]);
  const routeSpec = RouteSpecification(
    cargo.origin(), newDestination, cargo.routeSpecification().arrivalDeadline()
  );
  cargo.specifyNewRoute(routeSpec);
  await cargoRepository.store(..._cargoStoreArgs(cargo));
  console.info(`Changed destination for cargo ${trackingIdStr} to ${routeSpec.destination()}`);
}

export { bookNewCargo, requestPossibleRoutesForCargo, assignCargoToRoute, changeDestination };
