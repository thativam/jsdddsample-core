'use strict';

/**
 * Handling history — ordered collection of handling events for a cargo.
 */
function HandlingHistory(handlingEvents) {
  if (!handlingEvents) throw new Error('Handling events are required');
  const _events = [...handlingEvents];

  function distinctEventsByCompletionTime() {
    const unique = [];
    for (const ev of _events) {
      if (!unique.some(u => u.sameEventAs(ev))) unique.push(ev);
    }
    return unique.sort((a, b) => a.completionTime().getTime() - b.completionTime().getTime());
  }

  function mostRecentlyCompletedEvent() {
    const distinct = distinctEventsByCompletionTime();
    return distinct.length === 0 ? null : distinct[distinct.length - 1];
  }

  function filterOnCargo(trackingId) {
    const filtered = _events.filter(ev => ev.cargo().trackingId().sameValueAs(trackingId));
    return HandlingHistory(filtered);
  }

  function sameValueAs(other) {
    if (!other || typeof other.distinctEventsByCompletionTime !== 'function') return false;
    const oe = other.distinctEventsByCompletionTime();
    const te = distinctEventsByCompletionTime();
    if (te.length !== oe.length) return false;
    return te.every((e, i) => e.equals(oe[i]));
  }
  function equals(other) { return sameValueAs(other); }

  return { distinctEventsByCompletionTime, mostRecentlyCompletedEvent, filterOnCargo, sameValueAs, equals };
}

HandlingHistory.EMPTY = HandlingHistory([]);

module.exports = HandlingHistory;
