'use strict';

const VALID_PATTERN = /^[a-zA-Z]{2}[a-zA-Z2-9]{3}$/;

/**
 * United Nations Location Code — value object.
 */
function UnLocode(countryAndLocation) {
  if (!countryAndLocation) throw new Error('Country and location may not be null');
  if (!VALID_PATTERN.test(countryAndLocation)) {
    throw new Error(`${countryAndLocation} is not a valid UN/LOCODE (does not match pattern)`);
  }
  const code = countryAndLocation.toUpperCase();

  function idString() { return code; }
  function sameValueAs(other) {
    return other != null && typeof other.idString === 'function' && code === other.idString();
  }
  function equals(other) { return sameValueAs(other); }
  function toString() { return code; }

  return { idString, sameValueAs, equals, toString };
}

module.exports = UnLocode;
