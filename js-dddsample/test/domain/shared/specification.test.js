'use strict';

const { Specification, withCombinators } = require('../../../src/domain/shared/Specification');

// Factory-style spec implementations (no class)
const AlwaysTrue  = Specification(() => true);
const AlwaysFalse = Specification(() => false);
const GreaterThan = (n) => Specification((t) => t > n);

describe('Specification combinators', () => {
  const T = AlwaysTrue;
  const F = AlwaysFalse;

  describe('and', () => {
    test('true AND true = true',   () => expect(T.and(T).isSatisfiedBy(null)).toBe(true));
    test('true AND false = false',  () => expect(T.and(F).isSatisfiedBy(null)).toBe(false));
    test('false AND true = false',  () => expect(F.and(T).isSatisfiedBy(null)).toBe(false));
    test('false AND false = false', () => expect(F.and(F).isSatisfiedBy(null)).toBe(false));
  });

  describe('or', () => {
    test('true OR true = true',    () => expect(T.or(T).isSatisfiedBy(null)).toBe(true));
    test('true OR false = true',   () => expect(T.or(F).isSatisfiedBy(null)).toBe(true));
    test('false OR true = true',   () => expect(F.or(T).isSatisfiedBy(null)).toBe(true));
    test('false OR false = false', () => expect(F.or(F).isSatisfiedBy(null)).toBe(false));
  });

  describe('not', () => {
    test('NOT true = false',  () => expect(T.not().isSatisfiedBy(null)).toBe(false));
    test('NOT false = true',  () => expect(F.not().isSatisfiedBy(null)).toBe(true));
  });

  describe('chaining', () => {
    const gt5  = GreaterThan(5);
    const gt10 = GreaterThan(10);

    test('value satisfying both',        () => expect(gt5.and(gt10).isSatisfiedBy(15)).toBe(true));
    test('value satisfying only first',  () => expect(gt5.and(gt10).isSatisfiedBy(8)).toBe(false));
    test('value satisfying either',      () => expect(gt5.or(gt10).isSatisfiedBy(8)).toBe(true));
    test('negation of compound',         () => expect(gt5.and(gt10).not().isSatisfiedBy(8)).toBe(true));
  });
});
