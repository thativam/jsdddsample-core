'use strict';

/**
 * Cargo inspection service — top-level independent function.
 * Re-derives delivery progress after a handling event.
 */

function inspectCargo(applicationEvents, cargoRepository, handlingEventRepository, trackingId) {
  if (!trackingId) throw new Error('Tracking ID is required');
  const cargo = cargoRepository.find(trackingId);
  if (!cargo) {
    console.warn(`Can't inspect non-existing cargo ${trackingId}`);
    return;
  }
  const handlingHistory = handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId);
  cargo.deriveDeliveryProgress(handlingHistory);

  if (cargo.delivery().isMisdirected()) {
    applicationEvents.cargoWasMisdirected(cargo);
  }
  if (cargo.delivery().isUnloadedAtDestination()) {
    applicationEvents.cargoHasArrived(cargo);
  }
  cargoRepository.store(cargo);
}

module.exports = { inspectCargo };
