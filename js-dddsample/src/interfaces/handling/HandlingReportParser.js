import TrackingId        from '../../domain/model/cargo/TrackingId.js';
import UnLocode          from '../../domain/model/location/UnLocode.js';
import VoyageNumber      from '../../domain/model/voyage/VoyageNumber.js';
import HandlingEventType from '../../domain/model/handling/HandlingEventType.js';

function parseUnLocode(str) {
  try { return UnLocode(str); }
  catch (e) { throw new Error(`Failed to parse UNLO code: ${str}`); }
}

function parseTrackingId(str) {
  try { return TrackingId(str); }
  catch (e) { throw new Error(`Failed to parse trackingId: ${str}`); }
}

function parseVoyageNumber(str) {
  if (!str || !str.trim()) return null;
  try { return VoyageNumber(str); }
  catch (e) { throw new Error(`Failed to parse voyage number: ${str}`); }
}

function parseDate(str) {
  const ISO_8601_FORMAT = 'yyyy-MM-dd HH:mm';
  const FORMAT_PATTERN  = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (!str || !FORMAT_PATTERN.test(str)) {
    throw new Error(`Invalid date format: ${str}, must be on ISO 8601 format: ${ISO_8601_FORMAT}`);
  }
  const d = new Date(str.replace(' ', 'T') + ':00Z');
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date format: ${str}, must be on ISO 8601 format: ${ISO_8601_FORMAT}`);
  }
  return d;
}

function parseEventType(str) {
  try { return HandlingEventType.valueOf(str); }
  catch (e) { throw new Error(`${str} is not a valid handling event type. Valid types are: ${HandlingEventType.values().map(t => t.name).join(', ')}`); }
}

function parse(report) {
  const completionTime = parseDate(report.completionTime);
  const voyageNumber   = parseVoyageNumber(report.voyageNumber);
  const type           = parseEventType(report.type);
  const unLocode       = parseUnLocode(report.unLocode);
  const trackingIds    = (report.trackingIds || []).map(parseTrackingId);

  return trackingIds.map(trackingId => ({
    registrationTime: new Date(),
    completionTime,
    trackingId,
    voyageNumber,
    type,
    unLocode,
  }));
}

function parseLine(line) {
  const columns = line.split(/\s{2,}/);
  let cols;
  if (columns.length === 5) {
    cols = columns;
  } else if (columns.length === 4) {
    cols = [columns[0], columns[1], '', columns[2], columns[3]];
  } else {
    throw new Error(`Wrong number of columns on line: ${line}, must be 4 or 5`);
  }

  const completionTime = parseDate(cols[0]);
  const trackingId     = parseTrackingId(cols[1]);
  const voyageNumber   = parseVoyageNumber(cols[2]);
  const unLocode       = parseUnLocode(cols[3]);
  const type           = parseEventType(cols[4]);

  return { registrationTime: new Date(), completionTime, trackingId, voyageNumber, type, unLocode };
}

export { parse, parseLine, parseUnLocode, parseTrackingId, parseVoyageNumber, parseDate, parseEventType };
