const express = require('express');
const { getPeronResponse } = require('../controllers/chatbotController');

const router = express.Router();

router.post('/', async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto requerido' });

  try {
    const respuestaTexto = await getPeronResponse(texto);
    res.json({ texto: respuestaTexto });
  } catch (error) {
    console.error('Error en /peron:', error.message);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
});

module.exports = router;
