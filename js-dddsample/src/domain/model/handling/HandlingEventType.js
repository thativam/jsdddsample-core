const HandlingEventType = Object.freeze({
  LOAD:     { name: 'LOAD',     voyageRequired: true  },
  UNLOAD:   { name: 'UNLOAD',   voyageRequired: true  },
  RECEIVE:  { name: 'RECEIVE',  voyageRequired: false },
  CLAIM:    { name: 'CLAIM',    voyageRequired: false },
  CUSTOMS:  { name: 'CUSTOMS',  voyageRequired: false },

  valueOf(name) {
    const t = HandlingEventType[name];
    if (!t || typeof t !== 'object') throw new Error(`${name} is not a valid handling event type`);
    return t;
  },

  values() {
    return [
      HandlingEventType.LOAD,
      HandlingEventType.UNLOAD,
      HandlingEventType.RECEIVE,
      HandlingEventType.CLAIM,
      HandlingEventType.CUSTOMS,
    ];
  },
});

export default HandlingEventType;
