'use strict';

/**
 * Cargo inspection application service — re-derives delivery after a handling event.
 */
class CargoInspectionService {
  /**
   * @param {object} applicationEvents
   * @param {import('../domain/model/cargo/CargoRepository')} cargoRepository
   * @param {import('../domain/model/handling/HandlingEventRepository')} handlingEventRepository
   */
  constructor(applicationEvents, cargoRepository, handlingEventRepository) {
    this._applicationEvents = applicationEvents;
    this._cargoRepository = cargoRepository;
    this._handlingEventRepository = handlingEventRepository;
  }

  /**
   * @param {import('../domain/model/cargo/TrackingId')} trackingId
   */
  inspectCargo(trackingId) {
    if (!trackingId) throw new Error('Tracking ID is required');

    const cargo = this._cargoRepository.find(trackingId);
    if (!cargo) {
      console.warn(`Can't inspect non-existing cargo ${trackingId}`);
      return;
    }

    const handlingHistory = this._handlingEventRepository.lookupHandlingHistoryOfCargo(trackingId);
    cargo.deriveDeliveryProgress(handlingHistory);

    if (cargo.delivery().isMisdirected()) {
      this._applicationEvents.cargoWasMisdirected(cargo);
    }

    if (cargo.delivery().isUnloadedAtDestination()) {
      this._applicationEvents.cargoHasArrived(cargo);
    }

    this._cargoRepository.store(cargo);
  }
}

module.exports = CargoInspectionService;
