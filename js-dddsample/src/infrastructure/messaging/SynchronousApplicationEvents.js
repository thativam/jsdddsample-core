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

export { createRef, setCargoInspectionService, cargoWasHandled, cargoWasMisdirected, cargoHasArrived, receivedHandlingEventRegistrationAttempt };
