import Location from '../../../../domain/model/location/Location.js';
import UnLocode from '../../../../domain/model/location/UnLocode.js';

function toDocument(unLocodeStr, name) {
  return { _id: unLocodeStr, name };
}

function toDomain(doc) {
  if (!doc) return null;
  return Location(UnLocode(doc._id), doc.name);
}

export { toDocument, toDomain };
