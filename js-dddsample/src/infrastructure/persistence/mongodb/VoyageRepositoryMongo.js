import * as VoyageMapper from './mappers/VoyageMapper.js';

function VoyageRepositoryMongo(collection, findLocation) {
  async function find(voyageNumber) {
    const doc = await collection.findOne({ _id: voyageNumber.idString() });
    return VoyageMapper.toDomain(doc, findLocation);
  }

  async function store(voyage) {
    const doc = VoyageMapper.toDocument(
      voyage.voyageNumber().idString(),
      voyage.schedule().carrierMovements().map(cm => ({
        fromCode:      cm.departureLocation().unLocode().idString(),
        toCode:        cm.arrivalLocation().unLocode().idString(),
        departureTime: cm.departureTime(),
        arrivalTime:   cm.arrivalTime(),
      })),
    );
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  return { find, store };
}

export default VoyageRepositoryMongo;
