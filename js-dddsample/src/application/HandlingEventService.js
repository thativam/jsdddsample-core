'use strict';

/**
 * Handling event application service — async top-level function.
 */

async function registerHandlingEvent(storeEvent, emitCargoWasHandled, createHandlingEvent, completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const event = await createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  await storeEvent(event);
  emitCargoWasHandled(event);   // fire-and-forget: event emission is async downstream
  console.info(`Registered handling event: ${event}`);
}

module.exports = { registerHandlingEvent };
