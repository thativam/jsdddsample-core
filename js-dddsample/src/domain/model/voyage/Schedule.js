'use strict';

/**
 * Voyage schedule — ordered list of carrier movements.
 */
function Schedule(carrierMovements) {
  if (!carrierMovements) throw new Error('Carrier movements are required');
  const _movements = [...carrierMovements];

  function carrierMovements_() { return [..._movements]; }
  function sameValueAs(other) {
    if (!other || typeof other.carrierMovements !== 'function') return false;
    const om = other.carrierMovements();
    if (_movements.length !== om.length) return false;
    return _movements.every((m, i) => m.equals(om[i]));
  }
  function equals(other) { return sameValueAs(other); }

  return { carrierMovements: carrierMovements_, sameValueAs, equals };
}

Schedule.EMPTY = Schedule([]);

module.exports = Schedule;
