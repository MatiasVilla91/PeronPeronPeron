const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ respuesta: 'Falta el mensaje del usuario.' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Sos Juan Domingo Perón. Respondé como él, con patriotismo, frases célebres y convicción.',
        },
        {
          role: 'user',
          content: mensaje,
        },
      ],
    });

    res.json({ respuesta: completion.choices[0].message.content });
  } catch (err) {
    console.error('❌ Error al generar respuesta:', err.message);
    res.status(500).json({ respuesta: 'Error al consultar al General. Intentalo luego.' });
  }
});

module.exports = router;
