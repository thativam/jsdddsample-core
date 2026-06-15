'use strict';

const HandlingHistory = require('../../../domain/model/handling/HandlingHistory');

/**
 * In-memory HandlingEvent repository.
 */
class HandlingEventRepositoryInMem {
  constructor() {
    /** @type {import('../../../domain/model/handling/HandlingEvent')[]} */
    this._events = [];
  }

  /** @param {import('../../../domain/model/handling/HandlingEvent')} event */
  store(event) {
    this._events.push(event);
  }

  /**
   * @param {import('../../../domain/model/cargo/TrackingId')} trackingId
   * @returns {HandlingHistory}
   */
  lookupHandlingHistoryOfCargo(trackingId) {
    const events = this._events.filter(
      e => e.cargo().trackingId().sameValueAs(trackingId)
    );
    return new HandlingHistory(events);
  }
}

module.exports = HandlingEventRepositoryInMem;
