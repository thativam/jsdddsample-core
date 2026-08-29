import HandlingEvent  from './HandlingEvent.js';
import TrackingId    from '../cargo/TrackingId.js';
import VoyageNumber  from '../voyage/VoyageNumber.js';
import UnLocode      from '../location/UnLocode.js';
import {
  UnknownCargoException,
  UnknownVoyageException,
  UnknownLocationException,
  CannotCreateHandlingEventException,
} from './exceptions.js';
import { cargoRepository, voyageRepository, locationRepository, handlingEventRepository } from '../../../ServiceContext.js';

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

/**
 * @param {Date}   registrationTime
 * @param {Date}   completionTime
 * @param {string} trackingIdStr
 * @param {string|null} voyageNumberStr
 * @param {string} unlocodeStr
 * @param {HandlingEventType} type
 */
async function createHandlingEvent(registrationTime, completionTime, trackingIdStr, voyageNumberStr, unlocodeStr, type) {
  try {
    const [cargo, voyage, location] = await Promise.all([
      findCargo(TrackingId(trackingIdStr)),
      findVoyage(voyageNumberStr ? VoyageNumber(voyageNumberStr) : null),
      findLocation(UnLocode(unlocodeStr)),
    ]);
    const event = HandlingEvent(cargo, completionTime, registrationTime, type, location, voyage || undefined);
    const cargoTrackingId = cargo.trackingId().idString();
    const typeName        = type.name;
    const locationCode    = location.unLocode().idString();
    const voyageNumber    = voyage ? voyage.voyageNumber().idString() : null;
    await handlingEventRepository.store(event, cargoTrackingId, typeName, locationCode, voyageNumber, completionTime, registrationTime);
    return { cargoTrackingId, typeName, locationCode, voyageNumber, completionTime };
  } catch (e) {
    throw new CannotCreateHandlingEventException(e);
  }
}

export default { createHandlingEvent };
