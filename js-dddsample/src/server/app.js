'use strict';

const express = require('express');
const path = require('path');
const container = require('./container');

const adminRoutes = require('./routes/adminRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const handlingRoutes = require('./routes/handlingRoutes');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve CSS, images, and other static files from public/
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML views as static files under /views
app.use('/views', express.static(path.join(__dirname, 'views')));

// ── Page entry points ─────────────────────────────────────────────────────────
// Root → public tracking page (mirrors Java's default servlet mapping)
app.get('/', (req, res) => {
  res.redirect('/views/track.html');
});

// /admin → admin cargo list (mirrors Java's /admin/registration dispatch)
app.get('/admin', (req, res) => {
  res.redirect('/views/admin/list.html');
});

// ── JSON API routes (called by HTML pages via fetch) ─────────────────────────
app.use('/admin', adminRoutes(container.bookingServiceFacade));
app.use('/track', trackingRoutes(container.cargoRepository, container.handlingEventRepository));
app.use('/', handlingRoutes(container.applicationEvents));

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, () => {
    console.info(`DDD Sample app running on http://localhost:${PORT}`);
    console.info(`  Admin:    http://localhost:${PORT}/admin`);
    console.info(`  Tracking: http://localhost:${PORT}/`);
  });
}

module.exports = app;
