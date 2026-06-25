'use strict';

const EventEmitter = require('events');

/**
 * Async, EventEmitter-based implementation of ApplicationEvents.
 *
 * Mirrors the Java JmsApplicationEventsImpl pattern:
 *
 *   Java JMS queue              → Node.js EventEmitter event
 *   ─────────────────────────────────────────────────────────
 *   handlingEventQueue          → 'handlingEventQueue'
 *   cargoHandledQueue           → 'cargoHandledQueue'
 *   misdirectedCargoQueue       → 'misdirectedCargoQueue'
 *   deliveredCargoQueue         → 'deliveredCargoQueue'
 *
 * In Java, each JMS queue has a separate @MessageDriven consumer bean.
 * Here, consumers are registered via .on('queueName', handler) in container.js.
 *
 * setImmediate() gives the same non-blocking semantics as sending to a JMS queue:
 * the current call stack completes before the consumer runs.
 */
class AsyncApplicationEvents extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Fired when a handling event registration attempt is received from the web layer.
   * Equivalent to: jmsOperations.send(handlingEventQueue, ...)
   *
   * Consumer: HandlingEventService.registerHandlingEvent()
   *
   * @param {import('../../interfaces/handling/HandlingReportParser').HandlingEventRegistrationAttempt} attempt
   */
  receivedHandlingEventRegistrationAttempt(attempt) {
    setImmediate(() => this.emit('handlingEventQueue', attempt));
  }

  /**
   * Fired when a cargo has been handled (a HandlingEvent was persisted).
   * Equivalent to: jmsOperations.send(cargoHandledQueue, cargo.trackingId().idString())
   *
   * Consumer: CargoInspectionService.inspectCargo()
   *
   * @param {import('../../domain/model/handling/HandlingEvent')} event
   */
  cargoWasHandled(event) {
    setImmediate(() => this.emit('cargoHandledQueue', event));
  }

  /**
   * Fired when cargo inspection detects a misdirected cargo.
   * Equivalent to: jmsOperations.send(misdirectedCargoQueue, cargo.trackingId().idString())
   *
   * Consumer: notification / logging
   *
   * @param {import('../../domain/model/cargo/Cargo')} cargo
   */
  cargoWasMisdirected(cargo) {
    setImmediate(() => this.emit('misdirectedCargoQueue', cargo));
  }

  /**
   * Fired when cargo inspection detects the cargo has arrived at destination.
   * Equivalent to: jmsOperations.send(deliveredCargoQueue, cargo.trackingId().idString())
   *
   * Consumer: notification / logging
   *
   * @param {import('../../domain/model/cargo/Cargo')} cargo
   */
  cargoHasArrived(cargo) {
    setImmediate(() => this.emit('deliveredCargoQueue', cargo));
  }
}

module.exports = AsyncApplicationEvents;
