'use strict';

/**
 * Specification interface. Implemented as base class with and/or/not combinators.
 */
class Specification {
  /** @param {*} t @returns {boolean} */
  isSatisfiedBy(t) { throw new Error('Not implemented'); }

  and(other) { return new AndSpecification(this, other); }
  or(other)  { return new OrSpecification(this, other); }
  not()      { return new NotSpecification(this); }
}

class AndSpecification extends Specification {
  constructor(a, b) { super(); this._a = a; this._b = b; }
  isSatisfiedBy(t) { return this._a.isSatisfiedBy(t) && this._b.isSatisfiedBy(t); }
}

class OrSpecification extends Specification {
  constructor(a, b) { super(); this._a = a; this._b = b; }
  isSatisfiedBy(t) { return this._a.isSatisfiedBy(t) || this._b.isSatisfiedBy(t); }
}

class NotSpecification extends Specification {
  constructor(inner) { super(); this._inner = inner; }
  isSatisfiedBy(t) { return !this._inner.isSatisfiedBy(t); }
}

module.exports = { Specification, AndSpecification, OrSpecification, NotSpecification };
