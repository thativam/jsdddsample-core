function assertVoyageRepository(impl) {
  const required = ['find', 'store'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`VoyageRepository implementation is missing method: ${method}`);
    }
  }
}

export { assertVoyageRepository };
