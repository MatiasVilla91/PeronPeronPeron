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

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://peronperon.netlify.app,http://localhost:5173')
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

// Ruta de prueba basica
app.get('/', (req, res) => {
  res.send('Backend del Bot Peron activo.');
});

app.listen(port, () => {
  console.log(`Bot Peron activo en http://localhost:${port}`);
});
