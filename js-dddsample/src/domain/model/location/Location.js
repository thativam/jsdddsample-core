'use strict';

const UnLocode = require('./UnLocode');

/**
 * A location — a stop on a journey, such as cargo origin/destination or carrier movement endpoint.
 * Uniquely identified by a UN Locode.
 */
class Location {
  /**
   * @param {UnLocode} unLocode
   * @param {string} name
   */
  constructor(unLocode, name) {
    if (!unLocode) throw new Error('UnLocode is required');
    if (!name) throw new Error('Name is required');
    this._unlocode = unLocode instanceof UnLocode ? unLocode.idString() : unLocode;
    this._name = name;
  }

  /** @returns {UnLocode} */
  unLocode() { return new UnLocode(this._unlocode); }

  /** @returns {string} */
  name() { return this._name; }

  /** @returns {string} */
  code() { return this._unlocode; }

  /** @param {Location} other @returns {boolean} */
  sameIdentityAs(other) {
    return other instanceof Location && this._unlocode === other._unlocode;
  }

  equals(other) { return this.sameIdentityAs(other); }

  toString() { return `${this._name} [${this._unlocode}]`; }
}

/** Special Location marking an unknown location. */
Location.UNKNOWN = new Location(new UnLocode('XXXXX'), 'Unknown location');

module.exports = Location;
