function withCombinators(spec) {
  spec.and = function(other) { return withCombinators({ isSatisfiedBy: (t) => spec.isSatisfiedBy(t) && other.isSatisfiedBy(t) }); };
  spec.or  = function(other) { return withCombinators({ isSatisfiedBy: (t) => spec.isSatisfiedBy(t) || other.isSatisfiedBy(t) }); };
  spec.not = function()      { return withCombinators({ isSatisfiedBy: (t) => !spec.isSatisfiedBy(t) }); };
  return spec;
}

function Specification(predicateFn) {
  return withCombinators({ isSatisfiedBy: predicateFn });
}

export { Specification, withCombinators };
