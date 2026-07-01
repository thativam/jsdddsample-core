'use strict';

const Cargo              = require('./Cargo');
const RouteSpecification = require('./RouteSpecification');

/**
 * Factory for creating Cargo aggregates — top-level independent function.
 * locationRepository and cargoRepository are injected as first parameters.
 */

function createCargo(locationRepository, cargoRepository, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const trackingId  = cargoRepository.nextTrackingId();
  const origin      = locationRepository.find(originUnLocode);
  const destination = locationRepository.find(destinationUnLocode);
  const routeSpec   = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

module.exports = { createCargo };
