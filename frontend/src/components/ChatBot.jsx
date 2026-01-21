import { useState } from 'react';

const defaultApiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://peronperonperon-1.onrender.com';
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

const ChatBot = ({ accessToken }) => {
  const [input, setInput] = useState('');
  const [chat, setChat] = useState([
    { role: 'peron', text: '¡Hola compañero! ¿En qué puedo ayudarte hoy?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const enviarMensaje = async () => {
    if (!input.trim()) return;

    const nuevoChat = [...chat, { role: 'user', text: input }];
    setChat(nuevoChat);
    setInput('');

    try {
      setIsTyping(true);
      const headers = {
        'Content-Type': 'application/json'
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await fetch(`${API_URL}/api/peron`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ texto: input })
      });

      if (res.status === 401) {
        setIsTyping(false);
        setChat([
          ...nuevoChat,
          { role: 'peron', text: 'Si querés más beneficios, iniciá sesión.' }
        ]);
        return;
      }

      if (res.status === 429) {
        setIsTyping(false);
        setChat([
          ...nuevoChat,
          { role: 'peron', text: 'Llegaste al límite diario. Pasá al plan Pro para seguir.' }
        ]);
        return;
      }

      const data = await res.json();

      setChat([
        ...nuevoChat,
        { role: 'peron', text: data.texto }
      ]);
      setIsTyping(false);
    } catch (err) {
      setIsTyping(false);
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
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message peron">
            <div className="chat-bubble">
              <p className="chat-author">Perón</p>
              <p className="chat-text">Escribiendo…</p>
            </div>
          </div>
        )}
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
