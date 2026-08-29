function toDTO(trackingId, originCode, finalDestinationCode, arrivalDeadline, legs, isMisrouted) {
  return {
    trackingId,
    origin:           originCode,
    finalDestination: finalDestinationCode,
    arrivalDeadline,
    legs,
    routed:    legs.length > 0,
    misrouted: isMisrouted,
  };
}

export { toDTO };
