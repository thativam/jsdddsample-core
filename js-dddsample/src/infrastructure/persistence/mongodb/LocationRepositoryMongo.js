import * as LocationMapper from './mappers/LocationMapper.js';

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

export default LocationRepositoryMongo;
