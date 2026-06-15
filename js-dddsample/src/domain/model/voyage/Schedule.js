'use strict';

class Schedule {
  /** @param {CarrierMovement[]} carrierMovements */
  constructor(carrierMovements) {
    this._carrierMovements = carrierMovements ? [...carrierMovements] : [];
  }

  carrierMovements() { return [...this._carrierMovements]; }

  sameValueAs(other) {
    if (!(other instanceof Schedule)) return false;
    if (this._carrierMovements.length !== other._carrierMovements.length) return false;
    return this._carrierMovements.every((m, i) => m.equals(other._carrierMovements[i]));
  }

  equals(other) { return this.sameValueAs(other); }
}

Schedule.EMPTY = new Schedule([]);

module.exports = Schedule;
