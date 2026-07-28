function assertCargoRepository(impl) {
  const required = ['find', 'store', 'getAll', 'nextTrackingId'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`CargoRepository implementation is missing method: ${method}`);
    }
  }
}

export { assertCargoRepository };
