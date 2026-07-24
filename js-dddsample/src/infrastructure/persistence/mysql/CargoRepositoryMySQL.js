'use strict';

const { randomUUID } = require('crypto');
const Cargo              = require('../../../domain/model/cargo/Cargo');
const TrackingId         = require('../../../domain/model/cargo/TrackingId');
const RouteSpecification = require('../../../domain/model/cargo/RouteSpecification');
const Itinerary          = require('../../../domain/model/cargo/Itinerary');
const Leg                = require('../../../domain/model/cargo/Leg');
const UnLocode           = require('../../../domain/model/location/UnLocode');
const VoyageNumber       = require('../../../domain/model/voyage/VoyageNumber');

/**
 * MySQL Cargo repository using mysql2/promise pool.
 *
 * Delivery is re-derived from handling history on every load (same strategy as MongoDB impl).
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Function} findLocation                 - async (UnLocode) => Location
 * @param {Function} findVoyage                   - async (VoyageNumber) => Voyage
 * @param {Function} lookupHandlingHistoryOfCargo - async (TrackingId) => HandlingHistory
 */
function CargoRepositoryMySQL(pool, findLocation, findVoyage, lookupHandlingHistoryOfCargo) {

  async function _buildCargo(row) {
    const trackingId = TrackingId(row.tracking_id);
    const [origin, dest] = await Promise.all([
      findLocation(UnLocode(row.origin_unlocode)),
      findLocation(UnLocode(row.dest_unlocode)),
    ]);
    const routeSpec = RouteSpecification(origin, dest, new Date(row.arrival_deadline));

    const [legRows] = await pool.execute(
      'SELECT voyage_number, load_unlocode, unload_unlocode, load_time, unload_time FROM itinerary_legs WHERE tracking_id = ? ORDER BY seq',
      [row.tracking_id]
    );

    let itinerary = null;
    if (legRows.length > 0) {
      const legs = await Promise.all(legRows.map(async lr => {
        const [voyage, loadLoc, unloadLoc] = await Promise.all([
          findVoyage(VoyageNumber(lr.voyage_number)),
          findLocation(UnLocode(lr.load_unlocode)),
          findLocation(UnLocode(lr.unload_unlocode)),
        ]);
        return Leg(voyage, loadLoc, unloadLoc, new Date(lr.load_time), new Date(lr.unload_time));
      }));
      itinerary = Itinerary(legs);
    }

    const cargo = Cargo(trackingId, routeSpec, itinerary);
    const history = await lookupHandlingHistoryOfCargo(trackingId);
    cargo.deriveDeliveryProgress(history);
    return cargo;
  }

  async function find(trackingId) {
    const [rows] = await pool.execute(
      'SELECT tracking_id, origin_unlocode, dest_unlocode, arrival_deadline FROM cargos WHERE tracking_id = ?',
      [trackingId.idString()]
    );
    if (rows.length === 0) return null;
    return _buildCargo(rows[0]);
  }

  async function store(cargo) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const tid = cargo.trackingId().idString();
      await conn.execute(
        'INSERT INTO cargos (tracking_id, origin_unlocode, dest_unlocode, arrival_deadline) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE dest_unlocode = VALUES(dest_unlocode), arrival_deadline = VALUES(arrival_deadline)',
        [tid, cargo.origin().unLocode().idString(), cargo.routeSpecification().destination().unLocode().idString(), cargo.routeSpecification().arrivalDeadline()]
      );
      await conn.execute('DELETE FROM itinerary_legs WHERE tracking_id = ?', [tid]);
      const itinerary = cargo.itinerary();
      if (itinerary) {
        const legs = itinerary.legs();
        for (let i = 0; i < legs.length; i++) {
          const leg = legs[i];
          await conn.execute(
            'INSERT INTO itinerary_legs (tracking_id, seq, voyage_number, load_unlocode, unload_unlocode, load_time, unload_time) VALUES (?,?,?,?,?,?,?)',
            [tid, i, leg.voyage().voyageNumber().idString(), leg.loadLocation().unLocode().idString(), leg.unloadLocation().unLocode().idString(), leg.loadTime(), leg.unloadTime()]
          );
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  async function getAll() {
    const [rows] = await pool.execute('SELECT tracking_id, origin_unlocode, dest_unlocode, arrival_deadline FROM cargos');
    return Promise.all(rows.map(_buildCargo));
  }

  async function nextTrackingId() {
    return TrackingId(randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase());
  }

  return { find, store, getAll, nextTrackingId };
}

module.exports = CargoRepositoryMySQL;
