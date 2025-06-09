const express = require('express');
const cors = require('cors');
require('dotenv').config();
const OpenAI = require('openai'); // ✅ Así se importa en v4

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔑 Inicializar OpenAI v4
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Ruta del chatbot
app.post('/api/peron', async (req, res) => {
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

    const respuesta = completion.choices[0].message.content;
    res.json({ respuesta });
  } catch (error) {
    console.error('Error al generar respuesta:', error);
    res.status(500).json({ respuesta: 'Error al consultar al General.' });
  }
});

// 🚀 Iniciar servidor
app.listen(port, () => {
  console.log(`Bot Perón escuchando en http://localhost:${port}`);
});
