'use strict';

const VoyageMapper = require('./mappers/VoyageMapper');

/**
 * MongoDB Voyage repository.
 *
 * @param {import('mongodb').Collection} collection   - db.collection('voyages')
 * @param {Function}                     findLocation  - async (UnLocode) => Location
 *   Required to reconstruct CarrierMovement location objects during toDomain.
 */
function VoyageRepositoryMongo(collection, findLocation) {

  async function find(voyageNumber) {
    const doc = await collection.findOne({ _id: voyageNumber.idString() });
    return VoyageMapper.toDomain(doc, findLocation);
  }

  async function store(voyage) {
    const doc = VoyageMapper.toDocument(voyage);
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  return { find, store };
}

module.exports = VoyageRepositoryMongo;
