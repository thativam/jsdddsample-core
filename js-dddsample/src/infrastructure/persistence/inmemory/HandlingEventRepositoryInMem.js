'use strict';

const HandlingHistory = require('../../../domain/model/handling/HandlingHistory');

/**
 * In-memory HandlingEvent repository — implements HandlingEventRepository port (async).
 */
function HandlingEventRepositoryInMem() {
  const _events = [];

  async function store(event) {
    _events.push(event);
  }

  async function lookupHandlingHistoryOfCargo(trackingId) {
    const filtered = _events.filter(e => e.cargo().trackingId().sameValueAs(trackingId));
    return HandlingHistory(filtered);
  }

  return { store, lookupHandlingHistoryOfCargo };
}

module.exports = HandlingEventRepositoryInMem;
