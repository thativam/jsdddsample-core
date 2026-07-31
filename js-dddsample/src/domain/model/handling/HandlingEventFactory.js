import HandlingEvent from './HandlingEvent.js';
import {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} from './exceptions.js';
import { cargoRepository, voyageRepository, locationRepository } from '../../../ServiceContext.js';

async function findCargo(trackingId) {
  const cargo = await cargoRepository.find(trackingId);
  if (!cargo) throw new UnknownCargoException(trackingId);
  return cargo;
}

async function findVoyage(voyageNumber) {
  if (!voyageNumber) return null;
  const voyage = await voyageRepository.find(voyageNumber);
  if (!voyage) throw new UnknownVoyageException(voyageNumber);
  return voyage;
}

async function findLocation(unlocode) {
  const location = await locationRepository.find(unlocode);
  if (!location) throw new UnknownLocationException(unlocode);
  return location;
}

async function createHandlingEvent(registrationTime, completionTime, trackingId, voyageNumber, unlocode, type) {
  try {
    const [cargo, voyage, location] = await Promise.all([
      findCargo(trackingId),
      findVoyage(voyageNumber),
      findLocation(unlocode),
    ]);
    return HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
  } catch (e) {
    throw new CannotCreateHandlingEventException(e);
  }
}

export default { createHandlingEvent };
