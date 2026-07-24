'use strict';

const Voyage          = require('../../../domain/model/voyage/Voyage');
const VoyageNumber    = require('../../../domain/model/voyage/VoyageNumber');
const Schedule        = require('../../../domain/model/voyage/Schedule');
const CarrierMovement = require('../../../domain/model/voyage/CarrierMovement');
const UnLocode        = require('../../../domain/model/location/UnLocode');

/**
 * MySQL Voyage repository using mysql2/promise pool.
 *
 * @param {import('mysql2/promise').Pool} pool
 * @param {Function} findLocation - async (UnLocode) => Location
 */
function VoyageRepositoryMySQL(pool, findLocation) {

  async function find(voyageNumber) {
    const [voyageRows] = await pool.execute(
      'SELECT voyage_number FROM voyages WHERE voyage_number = ?',
      [voyageNumber.idString()]
    );
    if (voyageRows.length === 0) return null;

    const [movRows] = await pool.execute(
      'SELECT from_unlocode, to_unlocode, departure_time, arrival_time FROM carrier_movements WHERE voyage_number = ? ORDER BY seq',
      [voyageNumber.idString()]
    );

    const movements = await Promise.all(movRows.map(async r => {
      const [from, to] = await Promise.all([
        findLocation(UnLocode(r.from_unlocode)),
        findLocation(UnLocode(r.to_unlocode)),
      ]);
      return CarrierMovement(from, to, new Date(r.departure_time), new Date(r.arrival_time));
    }));

    return Voyage(VoyageNumber(voyageRows[0].voyage_number), Schedule(movements));
  }

  async function store(voyage) {
    const vNum = voyage.voyageNumber().idString();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO voyages (voyage_number) VALUES (?) ON DUPLICATE KEY UPDATE voyage_number = VALUES(voyage_number)',
        [vNum]
      );
      await conn.execute('DELETE FROM carrier_movements WHERE voyage_number = ?', [vNum]);
      const movements = voyage.schedule().carrierMovements();
      for (let i = 0; i < movements.length; i++) {
        const cm = movements[i];
        await conn.execute(
          'INSERT INTO carrier_movements (voyage_number, seq, from_unlocode, to_unlocode, departure_time, arrival_time) VALUES (?,?,?,?,?,?)',
          [vNum, i, cm.departureLocation().unLocode().idString(), cm.arrivalLocation().unLocode().idString(), cm.departureTime(), cm.arrivalTime()]
        );
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  return { find, store };
}

module.exports = VoyageRepositoryMySQL;
