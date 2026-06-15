'use strict';

const TrackingId = require('../../domain/model/cargo/TrackingId');
const UnLocode = require('../../domain/model/location/UnLocode');
const VoyageNumber = require('../../domain/model/voyage/VoyageNumber');
const HandlingEventType = require('../../domain/model/handling/HandlingEventType');

const ISO_8601_FORMAT = 'yyyy-MM-dd HH:mm';

/**
 * Utility methods for parsing handling reports.
 * Mirrors HandlingReportParser.java.
 */

function parseUnLocode(str) {
  try {
    return new UnLocode(str);
  } catch (e) {
    throw new Error(`Failed to parse UNLO code: ${str}`);
  }
}

function parseTrackingId(str) {
  try {
    return new TrackingId(str);
  } catch (e) {
    throw new Error(`Failed to parse trackingId: ${str}`);
  }
}

function parseVoyageNumber(str) {
  if (!str || !str.trim()) return null;
  try {
    return new VoyageNumber(str);
  } catch (e) {
    throw new Error(`Failed to parse voyage number: ${str}`);
  }
}

function parseDate(str) {
  if (!str) throw new Error(`Invalid date format: ${str}, must be on ISO 8601 format: ${ISO_8601_FORMAT}`);
  try {
    // Accept "yyyy-MM-dd HH:mm" or ISO 8601
    const normalized = str.replace(' ', 'T') + (str.includes('T') ? '' : ':00Z');
    const d = new Date(normalized.endsWith('Z') ? normalized : normalized + 'Z');
    if (isNaN(d.getTime())) throw new Error('Invalid date');
    return d;
  } catch (e) {
    throw new Error(`Invalid date format: ${str}, must be on ISO 8601 format: ${ISO_8601_FORMAT}`);
  }
}

function parseEventType(str) {
  try {
    return HandlingEventType.valueOf(str);
  } catch (e) {
    throw new Error(`${str} is not a valid handling event type. Valid types are: ${HandlingEventType.values().map(t => t.name).join(', ')}`);
  }
}

/**
 * @typedef {{registrationTime:Date, completionTime:Date, trackingId:TrackingId, voyageNumber:VoyageNumber|null, type:object, unLocode:UnLocode}} HandlingEventRegistrationAttempt
 */

/**
 * Parse a JSON handling report into registration attempts.
 * @param {{completionTime:string, voyageNumber:string, type:string, unLocode:string, trackingIds:string[]}} report
 * @returns {HandlingEventRegistrationAttempt[]}
 */
function parse(report) {
  const completionTime = parseDate(report.completionTime);
  const voyageNumber = parseVoyageNumber(report.voyageNumber);
  const type = parseEventType(report.type);
  const unLocode = parseUnLocode(report.unLocode);
  const trackingIds = (report.trackingIds || []).map(parseTrackingId);

  return trackingIds.map(trackingId => ({
    registrationTime: new Date(),
    completionTime,
    trackingId,
    voyageNumber,
    type,
    unLocode,
  }));
}

/**
 * Parse a single CSV line into a registration attempt.
 * Format: completionTime  trackingId  [voyageNumber]  unLocode  eventType
 */
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
  const trackingId = parseTrackingId(cols[1]);
  const voyageNumber = parseVoyageNumber(cols[2]);
  const unLocode = parseUnLocode(cols[3]);
  const type = parseEventType(cols[4]);

  return { registrationTime: new Date(), completionTime, trackingId, voyageNumber, type, unLocode };
}

module.exports = { parse, parseLine, parseUnLocode, parseTrackingId, parseVoyageNumber, parseDate, parseEventType, ISO_8601_FORMAT };
