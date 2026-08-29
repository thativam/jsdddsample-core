import Cargo              from './Cargo.js';
import RouteSpecification from './RouteSpecification.js';
import UnLocode           from '../location/UnLocode.js';
import { cargoRepository, locationRepository } from '../../../ServiceContext.js';

async function createCargo(originUnLocodeStr, destinationUnLocodeStr, arrivalDeadline) {
  const trackingId   = await cargoRepository.nextTrackingId();
  const [origin, destination] = await Promise.all([
    locationRepository.find(UnLocode(originUnLocodeStr)),
    locationRepository.find(UnLocode(destinationUnLocodeStr)),
  ]);
  const routeSpec = RouteSpecification(origin, destination, arrivalDeadline);
  const cargo = Cargo(trackingId, routeSpec);
  const originCode = origin.unLocode().idString();
  await cargoRepository.store(cargo, trackingId.idString(), originCode, originCode, destination.unLocode().idString(), arrivalDeadline, null);
  return trackingId.idString();
}

export default { createCargo };
