const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const generarAudio = require('./voz/voz');
const peronRouter = require('./routes/peron');
const subscribeRouter = require('./routes/subscribe');
const mercadopagoWebhook = require('./routes/mercadopagoWebhook');
const meRouter = require('./routes/me');
const historyRouter = require('./routes/history');
const subscriptionRouter = require('./routes/subscription');
const { loadDocuments } = require('./controllers/trainController');

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS
    || 'https://peronperon.netlify.app,https://peronperon.site,https://www.peronperon.site,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.set('trust proxy', 1);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return allowedOrigins.has(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

// Servir audios generados
app.use('/audios', express.static(path.join(__dirname, 'voz')));

// API del Bot Peron
app.use('/api/', apiLimiter);
app.use('/api/peron', peronRouter);
app.use('/api/subscribe', subscribeLimiter, subscribeRouter);
app.use('/api/me', meRouter);
app.use('/api/history', historyRouter);
app.use('/api/subscription', subscribeLimiter, subscriptionRouter);
app.use('/webhooks/mercadopago', mercadopagoWebhook);

const isServiceRoleKey = (key = "") => {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  if (!key.startsWith('eyJ')) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
    return payload?.role === 'service_role';
  } catch (error) {
    return false;
  }
};

app.get('/api/debug/supabase', (req, res) => {
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const projectRef = url.replace(/^https?:\/\//, '').split('.')[0] || null;
  const serviceRoleValid = isServiceRoleKey(serviceKey) && serviceKey !== anonKey;
  res.json({
    projectRef,
    hasAnonKey: Boolean(anonKey),
    hasServiceRoleKey: Boolean(serviceKey),
    serviceRoleValid,
    anonKeyStartsWith: anonKey ? anonKey.slice(0, 10) : null,
    serviceKeyStartsWith: serviceKey ? serviceKey.slice(0, 10) : null
  });
});

// Ruta de prueba basica
app.get('/', (req, res) => {
  res.send('Backend del Bot Peron activo.');
});

loadDocuments();

app.listen(port, () => {
  console.log(`Bot Peron activo en http://localhost:${port}`);
});
