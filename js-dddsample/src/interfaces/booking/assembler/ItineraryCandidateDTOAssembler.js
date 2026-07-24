'use strict';

const Itinerary    = require('../../../domain/model/cargo/Itinerary');
const Leg          = require('../../../domain/model/cargo/Leg');
const VoyageNumber = require('../../../domain/model/voyage/VoyageNumber');
const UnLocode     = require('../../../domain/model/location/UnLocode');

/**
 * Assembles RouteCandidateDTO from Itinerary and vice versa.
 * fromDTO is async: findVoyage/findLocation callbacks are async repo methods.
 */

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

module.exports = { toDTO, fromDTO };
