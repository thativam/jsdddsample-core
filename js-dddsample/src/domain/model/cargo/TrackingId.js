'use strict';

class TrackingId {
  /** @param {string} id */
  constructor(id) {
    if (!id) throw new Error('Tracking ID is required and must not be empty');
    this._id = id;
  }

  idString() { return this._id; }

  sameValueAs(other) { return other instanceof TrackingId && this._id === other._id; }

  equals(other) { return this.sameValueAs(other); }

  toString() { return this._id; }
}

module.exports = TrackingId;
