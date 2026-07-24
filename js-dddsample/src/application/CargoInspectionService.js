'use strict';

/**
 * Cargo inspection service — async top-level function.
 */

async function inspectCargo(findCargo, storeCargo, lookupHistory, emitMisdirected, emitArrived, trackingId) {
  if (!trackingId) throw new Error('Tracking ID is required');
  const cargo = await findCargo(trackingId);
  if (!cargo) {
    console.warn(`Can't inspect non-existing cargo ${trackingId}`);
    return;
  }
  const handlingHistory = await lookupHistory(trackingId);
  cargo.deriveDeliveryProgress(handlingHistory);

  if (cargo.delivery().isMisdirected()) {
    emitMisdirected(cargo);
  }
  if (cargo.delivery().isUnloadedAtDestination()) {
    emitArrived(cargo);
  }
  await storeCargo(cargo);
}

module.exports = { inspectCargo };
