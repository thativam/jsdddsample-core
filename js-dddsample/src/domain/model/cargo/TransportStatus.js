'use strict';

const TransportStatus = Object.freeze({
  NOT_RECEIVED: 'NOT_RECEIVED',
  IN_PORT: 'IN_PORT',
  ONBOARD_CARRIER: 'ONBOARD_CARRIER',
  CLAIMED: 'CLAIMED',
  UNKNOWN: 'UNKNOWN',
});

module.exports = TransportStatus;
