'use strict';

/**
 * Synchronous ApplicationEvents — top-level independent functions.
 * Used in unit/scenario tests in place of the async queue.
 *
 * The mutable back-reference to CargoInspectionService is held in a plain
 * ref object created by createRef(), which is injected as the first parameter.
 */

function createRef() {
  return { cargoInspectionService: null };
}

function setCargoInspectionService(ref, svc) {
  ref.cargoInspectionService = svc;
}

function cargoWasHandled(ref, event) {
  ref.cargoInspectionService.inspectCargo(event.cargo().trackingId());
}

function cargoWasMisdirected(ref, cargo) {
  console.warn(`Cargo ${cargo.trackingId()} was misdirected`);
}

function cargoHasArrived(ref, cargo) {
  console.info(`Cargo ${cargo.trackingId()} has arrived`);
}

function receivedHandlingEventRegistrationAttempt(ref, attempt) {
  // Synchronous no-op — tests call HandlingEventService directly
}

module.exports = { createRef, setCargoInspectionService, cargoWasHandled, cargoWasMisdirected, cargoHasArrived, receivedHandlingEventRegistrationAttempt };
