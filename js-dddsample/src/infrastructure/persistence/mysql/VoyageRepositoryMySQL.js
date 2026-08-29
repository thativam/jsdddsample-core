import Voyage          from '../../../domain/model/voyage/Voyage.js';
import VoyageNumber    from '../../../domain/model/voyage/VoyageNumber.js';
import Schedule        from '../../../domain/model/voyage/Schedule.js';
import CarrierMovement from '../../../domain/model/voyage/CarrierMovement.js';
import UnLocode        from '../../../domain/model/location/UnLocode.js';

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

  async function store(_, voyageNumberStr, carrierMovements) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        'INSERT INTO voyages (voyage_number) VALUES (?) ON DUPLICATE KEY UPDATE voyage_number = VALUES(voyage_number)',
        [voyageNumberStr]
      );
      await conn.execute('DELETE FROM carrier_movements WHERE voyage_number = ?', [voyageNumberStr]);
      for (let i = 0; i < carrierMovements.length; i++) {
        const cm = carrierMovements[i];
        await conn.execute(
          'INSERT INTO carrier_movements (voyage_number, seq, from_unlocode, to_unlocode, departure_time, arrival_time) VALUES (?,?,?,?,?,?)',
          [voyageNumberStr, i, cm.fromCode, cm.toCode, cm.departureTime, cm.arrivalTime]
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

export default VoyageRepositoryMySQL;
