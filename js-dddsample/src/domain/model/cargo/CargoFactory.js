'use strict';

const Cargo              = require('./Cargo');
const RouteSpecification = require('./RouteSpecification');

/**
 * Factory for creating Cargo aggregates — async top-level function.
 * nextTrackingId and findLocation are async callbacks (repo methods).
 */

async function createCargo(nextTrackingId, findLocation, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const trackingId  = await nextTrackingId();
  const origin      = await findLocation(originUnLocode);
  const destination = await findLocation(destinationUnLocode);
  const routeSpec   = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

module.exports = { createCargo };
