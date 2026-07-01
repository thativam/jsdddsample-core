'use strict';

const HandlingHistory = require('../../../domain/model/handling/HandlingHistory');

/**
 * In-memory HandlingEvent repository.
 */
function HandlingEventRepositoryInMem() {
  const _events = [];

  function store(event) {
    _events.push(event);
  }

  function lookupHandlingHistoryOfCargo(trackingId) {
    const filtered = _events.filter(e => e.cargo().trackingId().sameValueAs(trackingId));
    return HandlingHistory(filtered);
  }

  return { store, lookupHandlingHistoryOfCargo };
}

module.exports = HandlingEventRepositoryInMem;
