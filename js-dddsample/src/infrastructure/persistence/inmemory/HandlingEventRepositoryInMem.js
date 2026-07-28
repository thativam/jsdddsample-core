import HandlingHistory from '../../../domain/model/handling/HandlingHistory.js';

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

export default HandlingEventRepositoryInMem;
