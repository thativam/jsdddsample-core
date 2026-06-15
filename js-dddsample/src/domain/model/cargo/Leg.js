'use strict';

const Location = require('../location/Location');
const Voyage = require('../voyage/Voyage');

/**
 * A single leg of an itinerary.
 */
class Leg {
  /**
   * @param {Voyage} voyage
   * @param {Location} loadLocation
   * @param {Location} unloadLocation
   * @param {Date} loadTime
   * @param {Date} unloadTime
   */
  constructor(voyage, loadLocation, unloadLocation, loadTime, unloadTime) {
    if (!voyage || !loadLocation || !unloadLocation || !loadTime || !unloadTime) {
      throw new Error('All Leg fields are required');
    }
    this._voyage = voyage;
    this._loadLocation = loadLocation;
    this._unloadLocation = unloadLocation;
    this._loadTime = loadTime instanceof Date ? loadTime : new Date(loadTime);
    this._unloadTime = unloadTime instanceof Date ? unloadTime : new Date(unloadTime);
  }

  voyage()          { return this._voyage; }
  loadLocation()    { return this._loadLocation; }
  unloadLocation()  { return this._unloadLocation; }
  loadTime()        { return this._loadTime; }
  unloadTime()      { return this._unloadTime; }

  sameValueAs(other) {
    return other instanceof Leg &&
      this._voyage.equals(other._voyage) &&
      this._loadLocation.equals(other._loadLocation) &&
      this._unloadLocation.equals(other._unloadLocation) &&
      this._loadTime.getTime() === other._loadTime.getTime() &&
      this._unloadTime.getTime() === other._unloadTime.getTime();
  }

  equals(other) { return this.sameValueAs(other); }
}

module.exports = Leg;
