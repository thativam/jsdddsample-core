'use strict';

const VALID_PATTERN = /^[a-zA-Z]{2}[a-zA-Z2-9]{3}$/;

/**
 * United Nations Location Code.
 */
class UnLocode {
  /** @param {string} countryAndLocation */
  constructor(countryAndLocation) {
    if (!countryAndLocation) throw new Error('Country and location may not be null');
    if (!VALID_PATTERN.test(countryAndLocation)) {
      throw new Error(`${countryAndLocation} is not a valid UN/LOCODE (does not match pattern)`);
    }
    this._code = countryAndLocation.toUpperCase();
  }

  /** @returns {string} */
  idString() { return this._code; }

  /** @param {UnLocode} other @returns {boolean} */
  sameValueAs(other) { return other instanceof UnLocode && this._code === other._code; }

  equals(other) { return this.sameValueAs(other); }

  toString() { return this._code; }
}

module.exports = UnLocode;
