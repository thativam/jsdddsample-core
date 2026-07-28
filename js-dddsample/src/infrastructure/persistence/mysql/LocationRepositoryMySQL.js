import Location from '../../../domain/model/location/Location.js';
import UnLocode from '../../../domain/model/location/UnLocode.js';

function LocationRepositoryMySQL(pool) {
  async function find(unLocode) {
    const [rows] = await pool.execute(
      'SELECT unlocode, name FROM locations WHERE unlocode = ?',
      [unLocode.idString()]
    );
    if (rows.length === 0) return null;
    return Location(UnLocode(rows[0].unlocode), rows[0].name);
  }

  async function store(location) {
    await pool.execute(
      'INSERT INTO locations (unlocode, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [location.unLocode().idString(), location.name()]
    );
  }

  async function getAll() {
    const [rows] = await pool.execute('SELECT unlocode, name FROM locations');
    return rows.map(r => Location(UnLocode(r.unlocode), r.name));
  }

  return { find, store, getAll };
}

export default LocationRepositoryMySQL;
