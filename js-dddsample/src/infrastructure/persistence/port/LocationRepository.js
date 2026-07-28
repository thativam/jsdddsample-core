function assertLocationRepository(impl) {
  const required = ['find', 'store', 'getAll'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`LocationRepository implementation is missing method: ${method}`);
    }
  }
}

export { assertLocationRepository };
