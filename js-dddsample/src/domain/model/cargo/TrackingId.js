function TrackingId(id) {
  if (!id) throw new Error('Tracking ID is required and must not be empty');
  const _id = String(id);

  function idString() { return _id; }
  function sameValueAs(other) {
    return other != null && typeof other.idString === 'function' && _id === other.idString();
  }
  function equals(other) { return sameValueAs(other); }
  function toString() { return _id; }

  return { idString, sameValueAs, equals, toString };
}

export default TrackingId;
