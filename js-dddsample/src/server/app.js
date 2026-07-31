import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pathToFileURL } from 'url';
import { createContainer } from './container.js';
import adminRoutes    from './routes/adminRoutes.js';
import trackingRoutes from './routes/trackingRoutes.js';
import handlingRoutes from './routes/handlingRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use('/views', express.static(join(__dirname, 'views')));

app.get('/',      (req, res) => res.redirect('/views/track.html'));
app.get('/admin', (req, res) => res.redirect('/views/admin/list.html'));

async function start() {
  const container = await createContainer();

  app.use('/admin', adminRoutes());
  app.use('/track', trackingRoutes());
  app.use('/', handlingRoutes());

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.info(`DDD Sample app running on http://localhost:${PORT}`);
    console.info(`  DB driver: ${process.env.DB_DRIVER || 'inmemory'}`);
    console.info(`  MQ driver: ${process.env.MQ_DRIVER || 'local'}`);
  });

  return container;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  start().catch(err => { console.error('Startup failed:', err); process.exit(1); });
}

export { app, start };
