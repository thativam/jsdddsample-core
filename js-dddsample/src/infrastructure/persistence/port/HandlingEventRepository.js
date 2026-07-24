'use strict';

/**
 * HandlingEventRepository — port interface contract.
 *
 * @interface
 *
 * store(event: HandlingEvent): Promise<void>
 *   Persist a new handling event.
 *
 * lookupHandlingHistoryOfCargo(trackingId: TrackingId): Promise<HandlingHistory>
 *   Return the full handling history for the given cargo.
 */

function assertHandlingEventRepository(impl) {
  const required = ['store', 'lookupHandlingHistoryOfCargo'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`HandlingEventRepository implementation is missing method: ${method}`);
    }
  }
}

module.exports = { assertHandlingEventRepository };
