import Location from '../../../../domain/model/location/Location.js';
import UnLocode from '../../../../domain/model/location/UnLocode.js';

function toDocument(location) {
  return { _id: location.unLocode().idString(), name: location.name() };
}

function toDomain(doc) {
  if (!doc) return null;
  return Location(UnLocode(doc._id), doc.name);
}

export { toDocument, toDomain };
