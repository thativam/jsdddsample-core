'use strict';

const HandlingEvent     = require('../../../domain/model/handling/HandlingEvent');
const HandlingEventType = require('../../../domain/model/handling/HandlingEventType');
const HandlingHistory   = require('../../../domain/model/handling/HandlingHistory');
const TrackingId        = require('../../../domain/model/cargo/TrackingId');
const UnLocode          = require('../../../domain/model/location/UnLocode');
const VoyageNumber      = require('../../../domain/model/voyage/VoyageNumber');

/**
 * MySQL HandlingEvent repository using mysql2/promise pool.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Function} findCargo    - async (TrackingId) => Cargo
 * @param {Function} findLocation - async (UnLocode) => Location
 * @param {Function} findVoyage   - async (VoyageNumber) => Voyage | null
 */
function HandlingEventRepositoryMySQL(pool, findCargo, findLocation, findVoyage) {

  async function store(event) {
    const voyageNum = event.voyage() && event.voyage().voyageNumber().idString() !== ''
      ? event.voyage().voyageNumber().idString()
      : null;
    await pool.execute(
      'INSERT INTO handling_events (cargo_tracking_id, type, location_unlocode, voyage_number, completion_time, registration_time) VALUES (?,?,?,?,?,?)',
      [event.cargo().trackingId().idString(), event.type().name, event.location().unLocode().idString(), voyageNum, event.completionTime(), event.registrationTime()]
    );
  }

  async function lookupHandlingHistoryOfCargo(trackingId) {
    const [rows] = await pool.execute(
      'SELECT type, location_unlocode, voyage_number, completion_time, registration_time FROM handling_events WHERE cargo_tracking_id = ? ORDER BY completion_time',
      [trackingId.idString()]
    );
    const events = await Promise.all(rows.map(async r => {
      const type = HandlingEventType[r.type];
      const [cargo, location, voyage] = await Promise.all([
        findCargo(trackingId),
        findLocation(UnLocode(r.location_unlocode)),
        r.voyage_number ? findVoyage(VoyageNumber(r.voyage_number)) : Promise.resolve(null),
      ]);
      return HandlingEvent(cargo, new Date(r.completion_time), new Date(r.registration_time), type, location, voyage || undefined);
    }));
    return HandlingHistory(events);
  }

  return { store, lookupHandlingHistoryOfCargo };
}

module.exports = HandlingEventRepositoryMySQL;
