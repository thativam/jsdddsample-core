'use strict';

const Location  = require('../../../../domain/model/location/Location');
const UnLocode  = require('../../../../domain/model/location/UnLocode');

/**
 * Converts between Location domain object and MongoDB document.
 *
 * Document shape:
 * { _id: "CNHKG", name: "Hongkong" }
 */

function toDocument(location) {
  return {
    _id:  location.unLocode().idString(),
    name: location.name(),
  };
}

function toDomain(doc) {
  if (!doc) return null;
  return Location(UnLocode(doc._id), doc.name);
}

module.exports = { toDocument, toDomain };
