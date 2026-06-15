'use strict';

const HandlingEventType = require('./HandlingEventType');
const Voyage = require('../voyage/Voyage');

/**
 * A HandlingEvent records when cargo is handled — loaded, unloaded, received, etc.
 * Root of the HandlingEvent aggregate.
 */
class HandlingEvent {
  /**
   * Constructor for events that require a voyage (LOAD, UNLOAD).
   * @param {import('../cargo/Cargo')} cargo
   * @param {Date} completionTime
   * @param {Date} registrationTime
   * @param {{name:string, voyageRequired:boolean}} type
   * @param {import('../location/Location')} location
   * @param {import('../voyage/Voyage')} [voyage]
   */
  constructor(cargo, completionTime, registrationTime, type, location, voyage) {
    if (!cargo) throw new Error('Cargo is required');
    if (!completionTime) throw new Error('Completion time is required');
    if (!registrationTime) throw new Error('Registration time is required');
    if (!type) throw new Error('Handling event type is required');
    if (!location) throw new Error('Location is required');

    if (type.voyageRequired) {
      if (!voyage) throw new Error(`Voyage is required for event type ${type.name}`);
    } else {
      if (voyage) throw new Error(`Voyage is not allowed with event type ${type.name}`);
    }

    this._cargo = cargo;
    this._completionTime = completionTime instanceof Date ? completionTime : new Date(completionTime);
    this._registrationTime = registrationTime instanceof Date ? registrationTime : new Date(registrationTime);
    this._type = type;
    this._location = location;
    this._voyage = voyage || null;
  }

  type()             { return this._type; }
  voyage()           { return this._voyage || Voyage.NONE; }
  completionTime()   { return this._completionTime; }
  registrationTime() { return this._registrationTime; }
  location()         { return this._location; }
  cargo()            { return this._cargo; }

  sameEventAs(other) {
    return other instanceof HandlingEvent &&
      this._cargo.sameIdentityAs(other._cargo) &&
      this._completionTime.getTime() === other._completionTime.getTime() &&
      this._location.equals(other._location) &&
      this._type === other._type &&
      (this._voyage === other._voyage ||
        (this._voyage && other._voyage && this._voyage.equals(other._voyage)));
  }

  equals(other) { return this.sameEventAs(other); }

  toString() {
    let s = `HandlingEvent[cargo=${this._cargo.trackingId()}, type=${this._type.name}, location=${this._location}, completed=${this._completionTime}`;
    if (this._voyage) s += `, voyage=${this._voyage.voyageNumber()}`;
    return s + ']';
  }
}

HandlingEvent.Type = HandlingEventType;

module.exports = HandlingEvent;
