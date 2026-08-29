function createRef() {
  return { cargoInspectionService: null };
}

function setCargoInspectionService(ref, svc) {
  ref.cargoInspectionService = svc;
}

function cargoWasHandled(ref, eventData) {
  ref.cargoInspectionService.inspectCargo(eventData.cargoTrackingId);
}

function cargoWasMisdirected(ref, cargoTrackingId) {
  console.warn(`Cargo ${cargoTrackingId} was misdirected`);
}

function cargoHasArrived(ref, cargoTrackingId) {
  console.info(`Cargo ${cargoTrackingId} has arrived`);
}

function receivedHandlingEventRegistrationAttempt(ref, attempt) {
  // Synchronous no-op — tests call HandlingEventService directly
}

export { createRef, setCargoInspectionService, cargoWasHandled, cargoWasMisdirected, cargoHasArrived, receivedHandlingEventRegistrationAttempt };
