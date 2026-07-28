import Cargo              from './Cargo.js';
import RouteSpecification from './RouteSpecification.js';

async function createCargo(nextTrackingId, findLocation, originUnLocode, destinationUnLocode, arrivalDeadline) {
  const trackingId  = await nextTrackingId();
  const origin      = await findLocation(originUnLocode);
  const destination = await findLocation(destinationUnLocode);
  const routeSpec   = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

export default { createCargo };
