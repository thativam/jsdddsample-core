import HandlingEventFactory from '../domain/model/handling/HandlingEventFactory.js';
import { handlingEventRepository, applicationEvents } from '../ServiceContext.js';

async function registerHandlingEvent(completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const event = await HandlingEventFactory.createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  await handlingEventRepository.store(event);
  applicationEvents.cargoWasHandled(event);
  console.info(`Registered handling event: ${event}`);
}

export { registerHandlingEvent };
