const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const generarAudio = require('./voz/voz');
const peronRouter = require('./routes/peron');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: ['https://TU-NOMBRE.netlify.app', 'http://localhost:5173']
}));

app.use(express.json());

// Servir audios generados
app.use('/audios', express.static(path.join(__dirname, 'voz')));

// API del Bot Perón
app.use('/api/peron', peronRouter);

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.send('🎙️ Backend del Bot Perón activo.');
});

app.listen(port, () => {
  console.log(`🎙️ Bot Perón activo en http://localhost:${port}`);
});
