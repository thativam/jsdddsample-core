'use strict';

const Location = require('../location/Location');

/**
 * A carrier movement is a vessel voyage from one location to another.
 */
class CarrierMovement {
  /**
   * @param {Location} departureLocation
   * @param {Location} arrivalLocation
   * @param {Date} departureTime
   * @param {Date} arrivalTime
   */
  constructor(departureLocation, arrivalLocation, departureTime, arrivalTime) {
    if (!departureLocation || !arrivalLocation || !departureTime || !arrivalTime) {
      throw new Error('All CarrierMovement fields are required');
    }
    this._departureLocation = departureLocation;
    this._arrivalLocation = arrivalLocation;
    this._departureTime = departureTime;
    this._arrivalTime = arrivalTime;
  }

  departureLocation() { return this._departureLocation; }
  arrivalLocation()   { return this._arrivalLocation; }
  departureTime()     { return this._departureTime; }
  arrivalTime()       { return this._arrivalTime; }

  sameValueAs(other) {
    return other instanceof CarrierMovement &&
      this._departureLocation.equals(other._departureLocation) &&
      this._arrivalLocation.equals(other._arrivalLocation) &&
      this._departureTime.getTime() === other._departureTime.getTime() &&
      this._arrivalTime.getTime() === other._arrivalTime.getTime();
  }

  equals(other) { return this.sameValueAs(other); }
}

CarrierMovement.NONE = new CarrierMovement(
  Location.UNKNOWN, Location.UNKNOWN, new Date(0), new Date(0)
);

module.exports = CarrierMovement;
