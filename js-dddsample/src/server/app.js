'use strict';

const express = require('express');
const path    = require('path');
const { createContainer } = require('./container');

const adminRoutes    = require('./routes/adminRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const handlingRoutes = require('./routes/handlingRoutes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

app.get('/',      (req, res) => res.redirect('/views/track.html'));
app.get('/admin', (req, res) => res.redirect('/views/admin/list.html'));

// ── Async startup: build container then mount routes ─────────────────────────
async function start() {
  const container = await createContainer();

  app.use('/admin', adminRoutes(container.bookingServiceFacade));
  app.use('/track', trackingRoutes(container.cargoRepository, container.handlingEventRepository));
  app.use('/', handlingRoutes(container.applicationEvents));

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.info(`DDD Sample app running on http://localhost:${PORT}`);
    console.info(`  DB driver: ${process.env.DB_DRIVER || 'inmemory'}`);
    console.info(`  MQ driver: ${process.env.MQ_DRIVER || 'local'}`);
  });

  return container;
}

if (require.main === module) {
  start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
}

// For tests that need access to a container, export the factory
module.exports = { app, start };
