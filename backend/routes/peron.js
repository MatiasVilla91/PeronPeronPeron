const express = require('express');
const router = express.Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const generarAudio = require('../voz/voz');
const { getPeronResponse } = require('../controllers/chatbotController');

router.post('/', async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto requerido' });

  try {
    // 🧠 Primero: generar la respuesta textual
    const respuestaTexto = await getPeronResponse(texto);

    // 📣 Segundo: generar el audio con la respuesta textual
    const nombreArchivo = `peron-${uuidv4().slice(0, 8)}.wav`;
    const rutaArchivo = path.join(__dirname, '..', 'voz', nombreArchivo);
    await generarAudio(respuestaTexto, rutaArchivo);

    // 📤 Tercero: enviar ambos en el JSON final
   res.json({
  texto: respuestaTexto,
  audio: '/audios/' + nombreArchivo
});
  } catch (error) {
    console.error('❌ Error en /peron:', error.message);
    res.status(500).json({ error: 'Error al generar respuesta con voz' });
  }
});

module.exports = router;
