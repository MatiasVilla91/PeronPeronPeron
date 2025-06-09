import { useState } from 'react';


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
      const res = await fetch('http://localhost:3000/api/peron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: input })
      });
      const data = await res.json();

      setChat([...nuevoChat, { role: 'peron', text: data.respuesta }]);
    } catch (err) {
      setChat([...nuevoChat, { role: 'peron', text: '⚠️ Error al contactar al General.' }]);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: 'auto' }}>
      <h2>Chat con Perón 🇦🇷</h2>
      <div style={{ height: '300px', overflowY: 'auto', border: '1px solid gray', padding: 10, marginBottom: 10 }}>
        {chat.map((msg, i) => (
          <p key={i}><strong>{msg.role === 'peron' ? 'Perón:' : 'Vos:'}</strong> {msg.text}</p>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && enviarMensaje()}
        placeholder="Escribile al General..."
        style={{ width: '80%', padding: '0.5rem' }}
      />
      <button onClick={enviarMensaje} style={{ padding: '0.5rem' }}>Enviar</button>
    </div>
  );
};

export default ChatBot;
