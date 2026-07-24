'use strict';

const LocationMapper = require('./mappers/LocationMapper');

/**
 * MongoDB Location repository.
 *
 * @param {import('mongodb').Collection} collection  - db.collection('locations')
 */
function LocationRepositoryMongo(collection) {

  async function find(unLocode) {
    const doc = await collection.findOne({ _id: unLocode.idString() });
    return LocationMapper.toDomain(doc);
  }

  async function store(location) {
    const doc = LocationMapper.toDocument(location);
    await collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async function getAll() {
    const docs = await collection.find({}).toArray();
    return docs.map(LocationMapper.toDomain);
  }

  return { find, store, getAll };
}

module.exports = LocationRepositoryMongo;
