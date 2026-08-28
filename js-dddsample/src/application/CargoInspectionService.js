import TrackingId from '../domain/model/cargo/TrackingId.js';
import { cargoRepository, handlingEventRepository, applicationEvents } from '../ServiceContext.js';

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
  if (cargo.delivery().isMisdirected())           applicationEvents.cargoWasMisdirected(cargo);
  if (cargo.delivery().isUnloadedAtDestination()) applicationEvents.cargoHasArrived(cargo);
  await cargoRepository.store(cargo);
}

export { inspectCargo };
