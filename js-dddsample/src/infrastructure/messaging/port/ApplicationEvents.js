'use strict';

/**
 * ApplicationEvents — port interface contract.
 *
 * All implementations MUST expose these methods:
 *
 * receivedHandlingEventRegistrationAttempt(attempt): void
 *   Publish a new handling attempt to the queue. Consumers call HandlingEventService.
 *   attempt: { completionTime, trackingId, voyageNumber, unLocode, type }
 *
 * cargoWasHandled(event): void
 *   Publish that a cargo was handled. Consumers call CargoInspectionService.
 *   Payload: the HandlingEvent aggregate (local) or a JSON descriptor (RabbitMQ).
 *
 * cargoWasMisdirected(cargo): void
 *   Publish that cargo is misdirected. Consumers log/notify.
 *
 * cargoHasArrived(cargo): void
 *   Publish that cargo arrived at destination. Consumers log/notify.
 *
 * ─── RabbitMQ note ────────────────────────────────────────────────────────────
 * Since domain objects are not serializable across process boundaries, the RabbitMQ
 * implementation sends JSON with primitive fields only:
 *
 *   cargoWasHandled    → { cargoTrackingId, type, locationCode, voyageNumber, completionTime }
 *   cargoWasMisdirected → { trackingId }
 *   cargoHasArrived    → { trackingId }
 *   receivedHandlingEventRegistrationAttempt → { completionTime, trackingId, voyageNumber, unLocode, type }
 *
 * Consumers reconstruct domain objects from their own local repository.
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

module.exports = { assertApplicationEvents };
