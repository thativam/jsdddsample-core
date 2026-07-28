/**
 * ApplicationEvents — port interface contract.
 *
 * All implementations MUST expose:
 *   receivedHandlingEventRegistrationAttempt(attempt): void
 *   cargoWasHandled(event): void
 *   cargoWasMisdirected(cargo): void
 *   cargoHasArrived(cargo): void
 *
 * RabbitMQ payloads (primitives only):
 *   cargoWasHandled    → { cargoTrackingId, type, locationCode, voyageNumber, completionTime }
 *   cargoWasMisdirected / cargoHasArrived → { trackingId }
 *   receivedHandlingEventRegistrationAttempt → { completionTime, trackingId, voyageNumber, unLocode, type }
 */

function assertApplicationEvents(impl) {
  const required = [
    'receivedHandlingEventRegistrationAttempt',
    'cargoWasHandled',
    'cargoWasMisdirected',
    'cargoHasArrived',
  ];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`ApplicationEvents implementation is missing method: ${method}`);
    }
  }
}

export { assertApplicationEvents };
