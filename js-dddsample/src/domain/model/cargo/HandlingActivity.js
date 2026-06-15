'use strict';

const Voyage = require('../voyage/Voyage');

/**
 * A handling activity — represents how and where a cargo can be handled.
 * Used to express predictions about expected future events.
 */
class HandlingActivity {
  /**
   * @param {{name:string}} type - HandlingEventType value
   * @param {import('../location/Location')} location
   * @param {import('../voyage/Voyage')} [voyage]
   */
  constructor(type, location, voyage = null) {
    if (!type) throw new Error('Handling event type is required');
    if (!location) throw new Error('Location is required');
    this._type = type;
    this._location = location;
    this._voyage = voyage;
  }

  type()     { return this._type; }
  location() { return this._location; }
  voyage()   { return this._voyage; }

  sameValueAs(other) {
    if (!(other instanceof HandlingActivity)) return false;
    if (this._type !== other._type) return false;
    if (!this._location.equals(other._location)) return false;
    if (this._voyage === null && other._voyage === null) return true;
    if (this._voyage === null || other._voyage === null) return false;
    return this._voyage.equals(other._voyage);
  }

  equals(other) { return this.sameValueAs(other); }

  toString() {
    return `HandlingActivity[type=${this._type.name}, location=${this._location}, voyage=${this._voyage}]`;
  }
}

module.exports = HandlingActivity;
