import Itinerary    from '../../../domain/model/cargo/Itinerary.js';
import Leg          from '../../../domain/model/cargo/Leg.js';
import VoyageNumber from '../../../domain/model/voyage/VoyageNumber.js';
import UnLocode     from '../../../domain/model/location/UnLocode.js';
import { voyageRepository, locationRepository } from '../../../ServiceContext.js';

function toDTO(legs) {
  return { legs };
}

async function fromDTO(dto) {
  const legs = await Promise.all(dto.legs.map(async legDTO => {
    const [voyage, loadLoc, unloadLoc] = await Promise.all([
      voyageRepository.find(VoyageNumber(legDTO.voyageNumber)),
      locationRepository.find(UnLocode(legDTO.from)),
      locationRepository.find(UnLocode(legDTO.to)),
    ]);
    return Leg(voyage, loadLoc, unloadLoc, new Date(legDTO.loadTime), new Date(legDTO.unloadTime));
  }));
  return Itinerary(legs);
}

export { toDTO, fromDTO };
