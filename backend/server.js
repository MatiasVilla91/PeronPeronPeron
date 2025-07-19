
const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config();
const generarAudio = require('./voz/voz');
const peronRouter = require('./routes/peron'); // ajustá si está en otra carpeta



const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir audios generados
app.use('/audios', express.static(path.join(__dirname, 'voz')));


// Ruta de Perón
app.use('/api/peron', require('./routes/peron'));
const PORT = 3000;
app.listen(port, () => {
  console.log(`🎙️ Bot Perón activo en http://localhost:${port}`);
});
