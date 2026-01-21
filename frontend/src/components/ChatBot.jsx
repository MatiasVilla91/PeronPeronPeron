import { useState } from 'react';

const defaultApiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://peron.onrender.com';
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

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

      setChat([
        ...nuevoChat,
        { role: 'peron', text: data.texto, audio: data.audio || null }
      ]);

      if (data.audio) {
        const audio = new Audio(`${API_URL}${data.audio}`);
        audio.play().catch(err => console.error('No se pudo reproducir el audio:', err));
      }
    } catch (err) {
      setChat([
        ...nuevoChat,
        { role: 'peron', text: 'Error al contactar al General.' }
      ]);
    }
  };

  return (
    <div className="chatbot">
      <div className="chatbot-header">
        <div>
          <p className="chatbot-title">Chat con Perón</p>
          <p className="chatbot-subtitle">Canal ciudadano · Respuesta directa</p>
        </div>
        <span className="chatbot-badge">EN LÍNEA</span>
      </div>

      <div className="chatbot-body">
        {chat.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble">
              <p className="chat-author">{msg.role === 'peron' ? 'Perón' : 'Vos'}</p>
              <p className="chat-text">{msg.text}</p>
              {msg.audio && (
                <button
                  className="audio-button"
                  onClick={() => {
                    const audio = new Audio(`${API_URL}${msg.audio}`);
                    audio.play();
                  }}
                >
                  Escuchar voz
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
          placeholder="Escribile al General..."
        />
        <button onClick={enviarMensaje}>Enviar</button>
      </div>
    </div>
  );
};

export default ChatBot;
