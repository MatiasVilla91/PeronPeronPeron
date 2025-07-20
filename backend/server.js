const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const generarAudio = require('./voz/voz');
const peronRouter = require('./routes/peron');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir frontend (Vite build)
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Servir audios generados
app.use('/audios', express.static(path.join(__dirname, 'voz')));

// API de Perón
app.use('/api/peron', peronRouter);

// Ruta para frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🎙️ Bot Perón activo en http://localhost:${port}`);
});
