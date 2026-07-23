'use strict';

const Cargo              = require('./Cargo');
const RouteSpecification = require('./RouteSpecification');

/**
 * Factory for creating Cargo aggregates — top-level independent function.
 * Receives only the individual callbacks it needs: nextTrackingId and findLocation.
 */

function createCargo(nextTrackingId, findLocation, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const trackingId  = nextTrackingId();
  const origin      = findLocation(originUnLocode);
  const destination = findLocation(destinationUnLocode);
  const routeSpec   = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

module.exports = { createCargo };
