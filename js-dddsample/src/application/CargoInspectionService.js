import { cargoRepository, handlingEventRepository, applicationEvents } from '../ServiceContext.js';

async function inspectCargo(trackingId) {
  if (!trackingId) throw new Error('Tracking ID is required');
  const [cargo, handlingHistory] = await Promise.all([
    cargoRepository.find(trackingId),
    handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId),
  ]);
  if (!cargo) {
    console.warn(`Can't inspect non-existing cargo ${trackingId}`);
    return;
  }
  cargo.deriveDeliveryProgress(handlingHistory);
  if (cargo.delivery().isMisdirected())           applicationEvents.cargoWasMisdirected(cargo);
  if (cargo.delivery().isUnloadedAtDestination()) applicationEvents.cargoHasArrived(cargo);
  await cargoRepository.store(cargo);
}

export { inspectCargo };
