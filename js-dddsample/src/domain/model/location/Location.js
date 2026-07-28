import UnLocode from './UnLocode.js';

function Location(unLocode, name) {
  const _code = typeof unLocode.idString === 'function' ? unLocode.idString() : String(unLocode);

  function unLocode_() { return UnLocode(_code); }
  function name_()     { return name; }
  function code()      { return _code; }

  function sameIdentityAs(other) {
    return other != null && typeof other.code === 'function' && _code === other.code();
  }
  function equals(other) { return sameIdentityAs(other); }
  function toString()    { return `${name} [${_code}]`; }

  return { unLocode: unLocode_, name: name_, code, sameIdentityAs, equals, toString };
}

Location.UNKNOWN = Location(UnLocode('XXXXX'), 'Unknown location');

export default Location;
