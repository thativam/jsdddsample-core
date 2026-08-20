/**
 * Application bootstrap — infrastructure initialization.
 *
 * Importing this module configures the database, messaging, ServiceContext,
 * and sample data exactly once (ES module cache guarantees a single execution
 * per process). Any entrypoint — HTTP server, queue worker, migration CLI —
 * just needs to import this file before touching any application code.
 *
 *   import container from './bootstrap.js';
 */
import { createContainer } from './server/container.js';

const container = await createContainer();

export default container;
