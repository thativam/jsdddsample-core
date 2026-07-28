function assertHandlingEventRepository(impl) {
  const required = ['store', 'lookupHandlingHistoryOfCargo'];
  for (const method of required) {
    if (typeof impl[method] !== 'function') {
      throw new Error(`HandlingEventRepository implementation is missing method: ${method}`);
    }
  }
}

export { assertHandlingEventRepository };
