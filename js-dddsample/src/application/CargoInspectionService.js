'use strict';

/**
 * Cargo inspection service — top-level independent function.
 * Receives only the individual callbacks it needs (no complex objects).
 */

function inspectCargo(findCargo, storeCargo, lookupHistory, emitMisdirected, emitArrived, trackingId) {
  if (!trackingId) throw new Error('Tracking ID is required');
  const cargo = findCargo(trackingId);
  if (!cargo) {
    console.warn(`Can't inspect non-existing cargo ${trackingId}`);
    return;
  }
  const handlingHistory = lookupHistory(trackingId);
  cargo.deriveDeliveryProgress(handlingHistory);

  if (cargo.delivery().isMisdirected()) {
    emitMisdirected(cargo);
  }
  if (cargo.delivery().isUnloadedAtDestination()) {
    emitArrived(cargo);
  }
  storeCargo(cargo);
}

module.exports = { inspectCargo };
