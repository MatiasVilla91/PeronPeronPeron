import { useState } from 'react';
import { supabase, supabaseReady } from '../lib/supabaseClient';

const ResetPasswordPanel = () => {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    if (!supabaseReady) {
      setLoading(false);
      setStatus('Faltan variables de Supabase en Netlify.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setStatus('No pudimos actualizar la contraseña.');
      return;
    }
    setStatus('Contraseña actualizada. Ya podés ingresar.');
  };

  return (
    <div className="auth-panel">
      <div className="auth-header">
        <h3>Restablecer contraseña</h3>
        <p>Ingresá una nueva contraseña para tu cuenta.</p>
      </div>
      <form className="auth-form" onSubmit={handleUpdate}>
        <label>
          Nueva contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </form>
      {status && <p className="auth-status">{status}</p>}
    </div>
  );
};

export default ResetPasswordPanel;
