import TrackingId from '../domain/model/cargo/TrackingId.js';
import { cargoRepository, handlingEventRepository, applicationEvents } from '../ServiceContext.js';

function _cargoStoreArgs(cargo) {
  console.log("[CargoInspection] Cargo is ", cargo)
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
 * @param {string} trackingIdStr
 */
async function inspectCargo(trackingIdStr) {
  if (!trackingIdStr) throw new Error('Tracking ID is required');
  const trackingId = TrackingId(trackingIdStr);
  const [cargo, handlingHistory] = await Promise.all([
    cargoRepository.find(trackingId),
    handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId),
  ]);
  if (!cargo) {
    console.warn(`Can't inspect non-existing cargo ${trackingIdStr}`);
    return;
  }
  cargo.deriveDeliveryProgress(handlingHistory);
  if (cargo.delivery().isMisdirected())           applicationEvents.cargoWasMisdirected(cargo.trackingId().idString());
  if (cargo.delivery().isUnloadedAtDestination()) applicationEvents.cargoHasArrived(cargo.trackingId().idString());
  await cargoRepository.store(..._cargoStoreArgs(cargo));
}

export { inspectCargo };
