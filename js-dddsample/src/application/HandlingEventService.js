async function registerHandlingEvent(storeEvent, emitCargoWasHandled, createHandlingEvent, completionTime, trackingId, voyageNumber, unLocode, type) {
  const registrationTime = new Date();
  const event = await createHandlingEvent(
    registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
  );
  await storeEvent(event);
  emitCargoWasHandled(event);
  console.info(`Registered handling event: ${event}`);
}

export { registerHandlingEvent };
