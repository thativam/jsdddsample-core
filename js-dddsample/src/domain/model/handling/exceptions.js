export class UnknownCargoException extends Error {
  constructor(trackingId) {
    super(`No cargo with tracking ID ${trackingId}`);
    this.name = 'UnknownCargoException';
  }
}

export class UnknownVoyageException extends Error {
  constructor(voyageNumber) {
    super(`No voyage with number ${voyageNumber}`);
    this.name = 'UnknownVoyageException';
  }
}

export class UnknownLocationException extends Error {
  constructor(unLocode) {
    super(`No location with UN Locode ${unLocode}`);
    this.name = 'UnknownLocationException';
  }
}

export class CannotCreateHandlingEventException extends Error {
  constructor(cause) {
    super(`Cannot create handling event: ${cause && cause.message ? cause.message : cause}`);
    this.name = 'CannotCreateHandlingEventException';
    this.cause = cause;
  }
}
