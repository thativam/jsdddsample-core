import HandlingEventFactory from '../domain/model/handling/HandlingEventFactory.js';
import { applicationEvents } from '../ServiceContext.js';

async function registerHandlingEvent(completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const eventData = await HandlingEventFactory.createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  applicationEvents.cargoWasHandled(eventData);
  console.info(`Registered handling event for cargo ${eventData.cargoTrackingId}`);
}

export { registerHandlingEvent };
