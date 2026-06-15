'use strict';

/**
 * Handling event application service.
 */
class HandlingEventService {
  /**
   * @param {import('../domain/model/handling/HandlingEventRepository')} handlingEventRepository
   * @param {object} applicationEvents
   * @param {import('../domain/model/handling/HandlingEventFactory')} handlingEventFactory
   */
  constructor(handlingEventRepository, applicationEvents, handlingEventFactory) {
    this._handlingEventRepository = handlingEventRepository;
    this._applicationEvents = applicationEvents;
    this._handlingEventFactory = handlingEventFactory;
  }

  /**
   * Register a handling event.
   * @param {Date} completionTime
   * @param {import('../domain/model/cargo/TrackingId')} trackingId
   * @param {import('../domain/model/voyage/VoyageNumber')|null} voyageNumber
   * @param {import('../domain/model/location/UnLocode')} unLocode
   * @param {{name:string, voyageRequired:boolean}} type
   * @throws {import('../domain/model/handling/exceptions').CannotCreateHandlingEventException}
   */
  registerHandlingEvent(completionTime, trackingId, voyageNumber, unLocode, type) {
    const registrationTime = new Date();
    const event = this._handlingEventFactory.createHandlingEvent(
      registrationTime, completionTime, trackingId, voyageNumber, unLocode, type
    );
    this._handlingEventRepository.store(event);
    this._applicationEvents.cargoWasHandled(event);
    console.info(`Registered handling event: ${event}`);
  }
}

module.exports = HandlingEventService;
