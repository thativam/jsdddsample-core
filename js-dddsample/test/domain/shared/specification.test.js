'use strict';

const { Specification, AndSpecification, OrSpecification, NotSpecification } = require('../../../src/domain/shared/Specification');

class AlwaysTrue extends Specification {
  isSatisfiedBy() { return true; }
}

class AlwaysFalse extends Specification {
  isSatisfiedBy() { return false; }
}

class GreaterThan extends Specification {
  constructor(n) { super(); this._n = n; }
  isSatisfiedBy(t) { return t > this._n; }
}

describe('Specification combinators', () => {
  const T = new AlwaysTrue();
  const F = new AlwaysFalse();

  describe('AndSpecification', () => {
    test('true AND true = true', () => expect(T.and(T).isSatisfiedBy(null)).toBe(true));
    test('true AND false = false', () => expect(T.and(F).isSatisfiedBy(null)).toBe(false));
    test('false AND true = false', () => expect(F.and(T).isSatisfiedBy(null)).toBe(false));
    test('false AND false = false', () => expect(F.and(F).isSatisfiedBy(null)).toBe(false));
  });

  describe('OrSpecification', () => {
    test('true OR true = true', () => expect(T.or(T).isSatisfiedBy(null)).toBe(true));
    test('true OR false = true', () => expect(T.or(F).isSatisfiedBy(null)).toBe(true));
    test('false OR true = true', () => expect(F.or(T).isSatisfiedBy(null)).toBe(true));
    test('false OR false = false', () => expect(F.or(F).isSatisfiedBy(null)).toBe(false));
  });

  describe('NotSpecification', () => {
    test('NOT true = false', () => expect(T.not().isSatisfiedBy(null)).toBe(false));
    test('NOT false = true', () => expect(F.not().isSatisfiedBy(null)).toBe(true));
  });

  describe('chaining', () => {
    const gt5 = new GreaterThan(5);
    const gt10 = new GreaterThan(10);

    test('value satisfying both', () => expect(gt5.and(gt10).isSatisfiedBy(15)).toBe(true));
    test('value satisfying only first', () => expect(gt5.and(gt10).isSatisfiedBy(8)).toBe(false));
    test('value satisfying either', () => expect(gt5.or(gt10).isSatisfiedBy(8)).toBe(true));
    test('negation of compound', () => expect(gt5.and(gt10).not().isSatisfiedBy(8)).toBe(true));
  });
});
