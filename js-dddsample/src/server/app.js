'use strict';

const express = require('express');
const path = require('path');
const container = require('./container');

const adminRoutes = require('./routes/adminRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const handlingRoutes = require('./routes/handlingRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML views directory for static HTML
app.use('/views', express.static(path.join(__dirname, 'views')));

// Routes (JSON API)
app.use('/admin', adminRoutes(container.bookingServiceFacade));
app.use('/track', trackingRoutes(container.cargoRepository, container.handlingEventRepository));
app.use('/', handlingRoutes(container.applicationEvents));

// Root → redirect to tracking page
app.get('/', (req, res) => {
  res.redirect('/views/track.html');
});

const PORT = process.env.PORT || 8080;

if (require.main === module) {
  app.listen(PORT, () => {
    console.info(`DDD Sample app running on http://localhost:${PORT}`);
    console.info('Try tracking "ABC123" or "JKL567"');
  });
}

module.exports = app;
