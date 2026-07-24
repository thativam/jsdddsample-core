'use strict';

const Location = require('../../../domain/model/location/Location');
const UnLocode = require('../../../domain/model/location/UnLocode');

/**
 * MySQL Location repository using mysql2/promise pool.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
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

module.exports = LocationRepositoryMySQL;
