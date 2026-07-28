function Leg(voyage, loadLocation, unloadLocation, loadTime, unloadTime) {
  if (!voyage || !loadLocation || !unloadLocation || !loadTime || !unloadTime) {
    throw new Error('All Leg fields are required');
  }
  const _loadTime   = loadTime instanceof Date   ? loadTime   : new Date(loadTime);
  const _unloadTime = unloadTime instanceof Date ? unloadTime : new Date(unloadTime);

  function voyage_()         { return voyage; }
  function loadLocation_()   { return loadLocation; }
  function unloadLocation_() { return unloadLocation; }
  function loadTime_()       { return _loadTime; }
  function unloadTime_()     { return _unloadTime; }

  function sameValueAs(other) {
    return other != null &&
      typeof other.voyage === 'function' &&
      voyage.equals(other.voyage()) &&
      loadLocation.equals(other.loadLocation()) &&
      unloadLocation.equals(other.unloadLocation()) &&
      _loadTime.getTime()   === other.loadTime().getTime() &&
      _unloadTime.getTime() === other.unloadTime().getTime();
  }
  function equals(other) { return sameValueAs(other); }

  return { voyage: voyage_, loadLocation: loadLocation_, unloadLocation: unloadLocation_, loadTime: loadTime_, unloadTime: unloadTime_, sameValueAs, equals };
}

export default Leg;
