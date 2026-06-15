'use strict';

class VoyageNumber {
  /** @param {string} number */
  constructor(number) {
    if (number === null || number === undefined) throw new Error('Voyage number is required');
    this._number = number;
  }

  idString() { return this._number; }

  sameValueAs(other) { return other instanceof VoyageNumber && this._number === other._number; }

  equals(other) { return this.sameValueAs(other); }

  toString() { return this._number; }
}

module.exports = VoyageNumber;
