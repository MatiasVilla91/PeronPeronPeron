import { useState } from 'react';
import { supabase, supabaseReady } from '../lib/supabaseClient';

const AuthPanel = ({ onAuth }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    if (!supabaseReady) {
      setLoading(false);
      setStatus('Faltan variables de Supabase en Netlify.');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (error) {
      console.error('Login error:', error);
      setStatus(error.message || 'No pudimos iniciar sesión. Verificá tus datos.');
      return;
    }
    onAuth?.(data.session);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    if (!supabaseReady) {
      setLoading(false);
      setStatus('Faltan variables de Supabase en Netlify.');
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    setLoading(false);
    if (error) {
      console.error('Signup error:', error);
      setStatus(error.message || 'No pudimos crear la cuenta. Probá con otro correo.');
      return;
    }
    if (!data.session) {
      setStatus('Revisá tu correo para confirmar la cuenta.');
    } else {
      onAuth?.(data.session);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    if (!supabaseReady) {
      setLoading(false);
      setStatus('Faltan variables de Supabase en Netlify.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      console.error('Reset error:', error);
      setStatus(error.message || 'No pudimos enviar el correo de recuperación.');
      return;
    }
    setStatus('Te enviamos un correo para recuperar la cuenta.');
  };

  return (
    <div className="auth-panel">
      <div className="auth-header">
        <h3>Accedé para continuar</h3>
        <p>Ingresá con tu email para guardar tu progreso y desbloquear el plan Pro.</p>
      </div>
      <form
        className="auth-form"
        onSubmit={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}
      >
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {mode !== 'reset' && (
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar link'}
        </button>
      </form>
      {status && <p className="auth-status">{status}</p>}
      <div className="auth-actions">
        <button type="button" onClick={() => setMode('login')}>Ya tengo cuenta</button>
        <button type="button" onClick={() => setMode('register')}>Crear cuenta</button>
        <button type="button" onClick={() => setMode('reset')}>Olvidé mi contraseña</button>
      </div>
    </div>
  );
};

export default AuthPanel;
