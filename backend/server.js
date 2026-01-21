const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const generarAudio = require('./voz/voz');
const peronRouter = require('./routes/peron');

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = new Set([
  'https://peronperon.netlify.app',
  'http://localhost:5173'
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  return origin.endsWith('.netlify.app') || origin.endsWith('.onrender.com');
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

app.use(express.json());

// Servir audios generados
app.use('/audios', express.static(path.join(__dirname, 'voz')));

// API del Bot Peron
app.use('/api/peron', peronRouter);

// Ruta de prueba basica
app.get('/', (req, res) => {
  res.send('Backend del Bot Peron activo.');
});

app.listen(port, () => {
  console.log(`Bot Peron activo en http://localhost:${port}`);
});
