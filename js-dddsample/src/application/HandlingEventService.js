'use strict';

/**
 * Handling event application service — top-level independent function.
 * Receives only the individual callbacks it needs (no complex objects).
 */

function registerHandlingEvent(storeEvent, emitCargoWasHandled, createHandlingEvent, completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const event = createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  storeEvent(event);
  emitCargoWasHandled(event);
  console.info(`Registered handling event: ${event}`);
}

module.exports = { registerHandlingEvent };
