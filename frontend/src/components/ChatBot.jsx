import { useState } from 'react';

// Detecta automáticamente si estás en local o en producción
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://bot-peron.onrender.com';

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([
    { role: 'peron', text: '¡Hola compañero! ¿En qué puedo ayudarte hoy?' }
  ]);

  const enviarMensaje = async () => {
    if (!input.trim()) return;

    const nuevoChat = [...chat, { role: 'user', text: input }];
    setChat(nuevoChat);
    setInput('');

    try {
      const res = await fetch(`${API_URL}/api/peron`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: input })
      });

      const data = await res.json();

      // Mostrar texto primero
      setChat([
        ...nuevoChat,
        { role: 'peron', text: data.texto, audio: data.audio || null }
      ]);

      // Reproducir voz después
      if (data.audio) {
        const audio = new Audio(`${API_URL}${data.audio}`);
        audio.play().catch(err => console.error('🎧 No se pudo reproducir el audio:', err));
      }

    } catch (err) {
      setChat([
        ...nuevoChat,
        { role: 'peron', text: '❌ Error al contactar al General.' }
      ]);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: '1rem' }}>
      <h2>Chat con Perón 🇦🇷</h2>

      {chat.map((msg, i) => (
        <div key={i} style={{ marginBottom: '1rem' }}>
          <p><strong>{msg.role === 'peron' ? 'Perón:' : 'Vos:'}</strong> {msg.text}</p>
          {msg.audio && (
            <button
              onClick={() => {
                const audio = new Audio(`${API_URL}${msg.audio}`);
                audio.play();
              }}
              style={{
                padding: '0.4rem 0.7rem',
                backgroundColor: '#1e88e5',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              🔊 Escuchar voz de Perón
            </button>
          )}
        </div>
      ))}

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
        placeholder="Escribile al General..."
        style={{ width: '80%', padding: '0.5rem', marginRight: '0.5rem' }}
      />
      <button onClick={enviarMensaje} style={{ padding: '0.5rem' }}>Enviar</button>
    </div>
  );
};

export default ChatBot;
