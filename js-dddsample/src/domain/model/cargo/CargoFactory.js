import Cargo              from './Cargo.js';
import RouteSpecification from './RouteSpecification.js';
import UnLocode           from '../location/UnLocode.js';
import { cargoRepository, locationRepository } from '../../../ServiceContext.js';

async function createCargo(originUnLocodeStr, destinationUnLocodeStr, arrivalDeadline) {
  const origin_     = UnLocode(originUnLocodeStr);
  const destination_ = UnLocode(destinationUnLocodeStr);
  const trackingId  = await cargoRepository.nextTrackingId();
  const [origin, destination] = await Promise.all([
    locationRepository.find(origin_),
    locationRepository.find(destination_),
  ]);
  const routeSpec = RouteSpecification(origin, destination, arrivalDeadline);
  return Cargo(trackingId, routeSpec);
}

export default { createCargo };
