'use strict';

/**
 * The handling history of a cargo — an ordered list of handling events.
 */
class HandlingHistory {
  /** @param {import('./HandlingEvent')[]} handlingEvents */
  constructor(handlingEvents) {
    if (!handlingEvents) throw new Error('Handling events are required');
    this._handlingEvents = [...handlingEvents];
  }

  /**
   * Distinct events (deduplicated) ordered by completion time.
   * @returns {import('./HandlingEvent')[]}
   */
  distinctEventsByCompletionTime() {
    // Deduplicate using sameEventAs
    const unique = [];
    for (const ev of this._handlingEvents) {
      if (!unique.some(u => u.sameEventAs(ev))) unique.push(ev);
    }
    return unique.sort((a, b) => a.completionTime().getTime() - b.completionTime().getTime());
  }

  /**
   * @returns {import('./HandlingEvent')|null}
   */
  mostRecentlyCompletedEvent() {
    const distinct = this.distinctEventsByCompletionTime();
    return distinct.length === 0 ? null : distinct[distinct.length - 1];
  }

  /**
   * @param {import('../cargo/TrackingId')} trackingId
   * @returns {HandlingHistory}
   */
  filterOnCargo(trackingId) {
    const filtered = this._handlingEvents.filter(
      ev => ev.cargo().trackingId().sameValueAs(trackingId)
    );
    return new HandlingHistory(filtered);
  }

  sameValueAs(other) {
    if (!(other instanceof HandlingHistory)) return false;
    if (this._handlingEvents.length !== other._handlingEvents.length) return false;
    return this._handlingEvents.every((e, i) => e.equals(other._handlingEvents[i]));
  }

  equals(other) { return this.sameValueAs(other); }
}

HandlingHistory.EMPTY = new HandlingHistory([]);

module.exports = HandlingHistory;
