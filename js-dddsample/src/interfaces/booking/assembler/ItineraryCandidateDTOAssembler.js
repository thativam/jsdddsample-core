import Itinerary    from '../../../domain/model/cargo/Itinerary.js';
import Leg          from '../../../domain/model/cargo/Leg.js';
import VoyageNumber from '../../../domain/model/voyage/VoyageNumber.js';
import UnLocode     from '../../../domain/model/location/UnLocode.js';

function toDTO(itinerary) {
  return {
    legs: itinerary.legs().map(leg => ({
      voyageNumber: leg.voyage().voyageNumber().idString(),
      from:         leg.loadLocation().unLocode().idString(),
      to:           leg.unloadLocation().unLocode().idString(),
      loadTime:     leg.loadTime(),
      unloadTime:   leg.unloadTime(),
    })),
  };
}

async function fromDTO(dto, findVoyage, findLocation) {
  const legs = await Promise.all(dto.legs.map(async legDTO => {
    const [voyage, loadLoc, unloadLoc] = await Promise.all([
      findVoyage(VoyageNumber(legDTO.voyageNumber)),
      findLocation(UnLocode(legDTO.from)),
      findLocation(UnLocode(legDTO.to)),
    ]);
    return Leg(voyage, loadLoc, unloadLoc, new Date(legDTO.loadTime), new Date(legDTO.unloadTime));
  }));
  return Itinerary(legs);
}

export { toDTO, fromDTO };
