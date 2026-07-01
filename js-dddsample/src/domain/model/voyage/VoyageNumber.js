'use strict';

/**
 * Voyage number — value object.
 */
function VoyageNumber(number) {
  if (number === undefined || number === null) throw new Error('Voyage number may not be null');
  const _number = String(number);

  function idString() { return _number; }
  function sameValueAs(other) {
    return other != null && typeof other.idString === 'function' && _number === other.idString();
  }
  function equals(other) { return sameValueAs(other); }
  function toString()    { return _number; }

  return { idString, sameValueAs, equals, toString };
}

module.exports = VoyageNumber;
