import HandlingEvent     from '../../../domain/model/handling/HandlingEvent.js';
import HandlingEventType from '../../../domain/model/handling/HandlingEventType.js';
import HandlingHistory   from '../../../domain/model/handling/HandlingHistory.js';
import TrackingId        from '../../../domain/model/cargo/TrackingId.js';
import UnLocode          from '../../../domain/model/location/UnLocode.js';
import VoyageNumber      from '../../../domain/model/voyage/VoyageNumber.js';

function HandlingEventRepositoryMySQL(pool, findCargo, findLocation, findVoyage) {
  async function store(_, cargoTrackingId, typeName, locationCode, voyageNumber, completionTime, registrationTime) {
    await pool.execute(
      'INSERT INTO handling_events (cargo_tracking_id, type, location_unlocode, voyage_number, completion_time, registration_time) VALUES (?,?,?,?,?,?)',
      [cargoTrackingId, typeName, locationCode, voyageNumber, completionTime, registrationTime]
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

export default HandlingEventRepositoryMySQL;
