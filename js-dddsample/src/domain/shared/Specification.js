'use strict';

/**
 * Specification - combinator base (factory pattern, no class).
 * Implementations provide isSatisfiedBy(); and/or/not are mixed in.
 */
function withCombinators(spec) {
  spec.and = function(other) { return withCombinators({ isSatisfiedBy: (t) => spec.isSatisfiedBy(t) && other.isSatisfiedBy(t) }); };
  spec.or  = function(other) { return withCombinators({ isSatisfiedBy: (t) => spec.isSatisfiedBy(t) || other.isSatisfiedBy(t) }); };
  spec.not = function()      { return withCombinators({ isSatisfiedBy: (t) => !spec.isSatisfiedBy(t) }); };
  return spec;
}

/**
 * Create a specification from a predicate function.
 * @param {function(*): boolean} predicateFn
 */
function Specification(predicateFn) {
  return withCombinators({ isSatisfiedBy: predicateFn });
}

module.exports = { Specification, withCombinators };
