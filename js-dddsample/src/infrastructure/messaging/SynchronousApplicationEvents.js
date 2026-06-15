'use strict';

/**
 * Synchronous implementation of ApplicationEvents (used in tests).
 * Immediately calls CargoInspectionService when a cargo is handled.
 */
class SynchronousApplicationEvents {
  constructor() {
    this._cargoInspectionService = null;
  }

  /** @param {import('../../application/CargoInspectionService')} svc */
  setCargoInspectionService(svc) {
    this._cargoInspectionService = svc;
  }

  /** @param {import('../../domain/model/handling/HandlingEvent')} event */
  cargoWasHandled(event) {
    this._cargoInspectionService.inspectCargo(event.cargo().trackingId());
  }

  /** @param {import('../../domain/model/cargo/Cargo')} cargo */
  cargoWasMisdirected(cargo) {
    console.warn(`Cargo ${cargo.trackingId()} was misdirected`);
  }

  /** @param {import('../../domain/model/cargo/Cargo')} cargo */
  cargoHasArrived(cargo) {
    console.info(`Cargo ${cargo.trackingId()} has arrived`);
  }

  /** @param {import('../../interfaces/handling/HandlingReportParser').HandlingEventRegistrationAttempt} attempt */
  receivedHandlingEventRegistrationAttempt(attempt) {
    // In a real system this would be async via a message queue.
    // For tests/demo we process synchronously here.
  }
}

module.exports = SynchronousApplicationEvents;
