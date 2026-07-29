import Cargo              from './Cargo.js';
import RouteSpecification from './RouteSpecification.js';
import { cargoRepository, locationRepository } from '../../../ServiceContext.js';

async function createCargo(originUnLocode, destinationUnLocode, arrivalDeadline) {
  const trackingId = await cargoRepository.nextTrackingId();
  const [origin, destination] = await Promise.all([
    locationRepository.find(originUnLocode),
    locationRepository.find(destinationUnLocode),
  ]);
  const routeSpec = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

export default { createCargo };
