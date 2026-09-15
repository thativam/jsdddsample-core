import HandlingEventFactory from '../domain/model/handling/HandlingEventFactory.js';
import { applicationEvents } from '../ServiceContext.js';
import { handlingEventsTotal } from '../infrastructure/metrics/MetricsCollector.js';

async function registerHandlingEvent(completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const eventData = await HandlingEventFactory.createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  handlingEventsTotal.inc({ type: eventData.typeName });
  applicationEvents.cargoWasHandled(eventData);
  console.info(`Registered handling event for cargo ${eventData.cargoTrackingId}`);
}

export { registerHandlingEvent };
