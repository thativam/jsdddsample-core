'use strict';

/**
 * Handling event application service — top-level independent function.
 */

function registerHandlingEvent(handlingEventRepository, applicationEvents, handlingEventFactory, completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const event = handlingEventFactory.createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  handlingEventRepository.store(event);
  applicationEvents.cargoWasHandled(event);
  console.info(`Registered handling event: ${event}`);
}

module.exports = { registerHandlingEvent };
