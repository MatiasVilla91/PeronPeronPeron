import { useState } from 'react';

const defaultApiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://peronperonperon-1.onrender.com';
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;

const ChatBot = ({ accessToken, chat, setChat }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatState = chat || [
    { role: 'peron', text: '¡Hola compañero! ¿En qué puedo ayudarte hoy?' }
  ];
  const setChatState = setChat || (() => {});

  const stripSourcesLabel = (text = '') => {
    return String(text)
      .split('\n')
      .filter((line) => !/^fuentes\s*:/i.test(line.trim()))
      .join('\n')
      .trim();
  };

  const renderChatText = (rawText = '') => {
    const text = stripSourcesLabel(rawText);
    const regex = /\[(\d+)\]\((https?:\/\/[^\s)]+)\)/g;
    const nodes = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [full, num, url] = match;
      const index = match.index;
      const before = text.slice(lastIndex, index);
      if (before) nodes.push(before);
      nodes.push({ type: 'citation', num, url, key: `${index}-${num}` });
      lastIndex = index + full.length;
    }

    const tail = text.slice(lastIndex);
    if (tail) nodes.push(tail);

    const withBreaks = [];
    nodes.forEach((node, idx) => {
      if (typeof node === 'string') {
        const parts = node.split('\n');
        parts.forEach((part, partIdx) => {
          if (part) withBreaks.push(part);
          if (partIdx < parts.length - 1) {
            withBreaks.push({ type: 'br', key: `br-${idx}-${partIdx}` });
          }
        });
      } else {
        withBreaks.push(node);
      }
    });

    return withBreaks.map((node, idx) => {
      if (typeof node === 'string') return node;
      if (node.type === 'br') return <br key={node.key || `br-${idx}`} />;
      return (
        <span
          key={node.key || `cit-${idx}`}
          className="citation"
          title={node.url}
          aria-label={`Fuente ${node.num}`}
        >
          i
        </span>
      );
    });
  };

  const enviarMensaje = async () => {
    if (!input.trim()) return;

    const nuevoChat = [...chatState, { role: 'user', text: input }];
    setChatState(nuevoChat);
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
        setChatState([
          ...nuevoChat,
          { role: 'peron', text: 'Si querés más beneficios, iniciá sesión.' }
        ]);
        return;
      }

      if (res.status === 429) {
        setIsTyping(false);
        setChatState([
          ...nuevoChat,
          { role: 'peron', text: 'Llegaste al límite diario. Pasá al plan Pro para seguir.' }
        ]);
        return;
      }

      const data = await res.json();

      setChatState([
        ...nuevoChat,
        { role: 'peron', text: data.texto }
      ]);
      setIsTyping(false);
    } catch (err) {
      setIsTyping(false);
      setChatState([
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
        {chatState.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'peron' && (
              <img
                className="chat-avatar"
                src="https://res.cloudinary.com/dlppjyxmb/image/upload/v1769229522/peron_cmq1xu.jpg"
                alt="Perón"
              />
            )}
            <div className="chat-bubble">
              <p className="chat-author">{msg.role === 'peron' ? 'Perón' : 'Vos'}</p>
              <p className="chat-text">{renderChatText(msg.text)}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat-message peron">
            <img
              className="chat-avatar"
              src="https://res.cloudinary.com/dlppjyxmb/image/upload/v1769229522/peron_cmq1xu.jpg"
              alt="Perón"
            />
            <div className="chat-bubble">
              <p className="chat-author">Perón</p>
                            <p className="chat-text">
                <span className="typing-indicator" aria-label="Peron esta escribiendo">
                  <span />
                  <span />
                  <span />
                </span>
              </p>
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
