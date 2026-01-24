import { useEffect, useState } from 'react';
import ChatBot from './components/ChatBot';
import AuthPanel from './components/AuthPanel';
import ResetPasswordPanel from './components/ResetPasswordPanel';
import { supabase, supabaseReady } from './lib/supabaseClient';
import './App.css';

const defaultApiUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://peronperonperon-1.onrender.com';
const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
const CHAT_DISABLED_UNTIL = new Date('2000-01-01T00:00:00Z');

function App() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyStatus, setHistoryStatus] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('');
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    setIsRecovery(window.location.hash.includes('type=recovery'));
    if (supabaseReady) {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
      });
      const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
      });
      return () => {
        listener?.subscription?.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    if (!authOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setAuthOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authOpen]);

  useEffect(() => {
    const fetchUser = async () => {
      if (!session?.access_token) {
        setUserInfo(null);
        setHistoryItems([]);
        setSubscriptionInfo(null);
        return;
      }
      try {
        setUserLoading(true);
        const res = await fetch(`${API_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setUserInfo(data);
        }
      } catch (error) {
        setUserInfo(null);
      } finally {
        setUserLoading(false);
      }
    };
    fetchUser();
  }, [session?.access_token]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session?.access_token) return;
      try {
        setHistoryLoading(true);
        const res = await fetch(`${API_URL}/api/history?limit=20`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setHistoryItems(data.items || []);
        }
      } catch (error) {
        setHistoryItems([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [session?.access_token]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${API_URL}/api/subscription`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        if (res.ok) {
          setSubscriptionInfo(data);
        }
      } catch (error) {
        setSubscriptionInfo(null);
      }
    };
    fetchSubscription();
  }, [session?.access_token]);

  const handleSignOut = async () => {
    if (supabaseReady) {
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  const handleSubscribe = async () => {
    setSubscribeStatus('');
    if (!session?.access_token) {
      setSubscribeStatus('Inicia sesion para suscribirte al Plan Pro.');
      setAuthOpen(true);
      return;
    }

    try {
      setSubscribeStatus('Generando suscripcion...');
      const res = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      });
      let data = null;
      let rawText = '';
      try {
        data = await res.json();
      } catch (error) {
        rawText = await res.text();
      }
      if (!res.ok || !data?.init_point) {
        const detail = data?.details || rawText || 'ProbÃ¡ de nuevo.';
        setSubscribeStatus(`No pudimos iniciar la suscripciÃ³n. ${detail}`);
        return;
      }
      window.location.href = data.init_point;
    } catch (error) {
      setSubscribeStatus('No pudimos iniciar la suscripcion. Proba de nuevo.');
    }
  };

  const handleSubscriptionAction = async (action) => {
    if (!session?.access_token) return;
    setSubscriptionStatus('Procesando...');
    try {
      const res = await fetch(`${API_URL}/api/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) {
        setSubscriptionStatus('No pudimos actualizar la suscripcion.');
        return;
      }
      setSubscriptionStatus(`Estado actualizado: ${data.status}`);
      setSubscriptionInfo((prev) => prev ? { ...prev, status: data.status, hasSubscription: true } : prev);
    } catch (error) {
      setSubscriptionStatus('No pudimos actualizar la suscripcion.');
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!session?.access_token) return;
    setHistoryStatus('');
    try {
      const res = await fetch(`${API_URL}/api/history/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) {
        setHistoryStatus('No pudimos borrar el elemento.');
        return;
      }
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setHistoryStatus('No pudimos borrar el elemento.');
    }
  };

  const formatHistoryTitle = (text = '') => {
    const trimmed = String(text).replace(/\s+/g, ' ').trim();
    if (!trimmed) return 'Nueva conversación';
    if (trimmed.length <= 60) return trimmed;
    return `${trimmed.slice(0, 57)}...`;
  };

  const historyDisplay = historyItems.filter((item) => item.role === 'user');
  const isChatDisabled = Date.now() < CHAT_DISABLED_UNTIL.getTime();

  return (
    <div className="app">
      <header className="site-header">
        <div className="container header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">☀</span>
            <div className="brand-text">
              <p className="brand-title">Proyecto PERON</p>
              <p className="brand-subtitle">Plataforma cívica contemporánea</p>
            </div>
          </div>
          <nav className="nav">
            <a href="#chat">Chat</a>
          </nav>
          <div className="header-actions">
            {session ? (
              <button className="ghost small" onClick={handleSignOut}>Salir</button>
            ) : (
              <button className="cta small" type="button" onClick={() => setAuthOpen(true)}>
                Sumarse
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">IA entrenada con Peron - Voz historica - Presente vivo</p>
              <h1>Escucha al Peron de hoy.</h1>
              <p className="lead">
                Creamos una IA entrenada con discursos, cartas y documentos reales de Juan Domingo Peron.
                Responde en su estilo, con claridad y conviccion, para ayudarte a entender el presente desde una mirada historica.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#chat">Quiero conversar</a>
                <a className="ghost" href="#propuesta">Ver como funciona</a>
              </div>
              <div className="stats">
                <div className="stat-card">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Respuesta en minutos</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">+120</span>
                  <span className="stat-label">Respuestas con identidad</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Base documental real</span>
                </div>
              </div>
            </div>
            <div className="hero-panel">
              <div className="sun-badge">
                <span>Sol de la patria</span>
                <strong>1945</strong>
              </div>
              <div className="panel-card">
                <p className="panel-title">Agenda de todos</p>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Trabajo e industria</p>
                    <p className="panel-text">Que el esfuerzo rinda y se vea en cada barrio.</p>
                  </div>
                </div>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Estado presente</p>
                    <p className="panel-text">Trámites claros, respuestas rápidas, solución real.</p>
                  </div>
                </div>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Unidad y futuro</p>
                    <p className="panel-text">Más unión, menos pelea, más destino común.</p>
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <span className="pill">Identidad</span>
                <span className="pill">Cercanía</span>
                <span className="pill">Futuro</span>
              </div>
            </div>
          </div>
        </section>

        <section id="chat" className="section chat-section">
          <div className="container chat-stack">
            <div className="chat-intro">
              <p className="section-eyebrow">Chat ciudadano</p>
              <h2>Proba ahora.</h2>
              <p className="section-lead">
                Hacelo una pregunta y recibi una respuesta con identidad peronista.
              </p>
              <div className="chat-callout">
                <span>Respuestas con fuentes</span>
                <strong>Estilo autentico y documentado</strong>
              </div>
            </div>
            {isChatDisabled ? (
              <div className="chat-shell">
                <div className="auth-panel">
                  <div className="auth-header">
                    <h3>Chat en mantenimiento</h3>
                    <p>El chat vuelve a estar activo mañana, 25/01/2026.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chat-layout">
                <aside className="chat-sidebar">
                  <button className="new-chat" type="button">
                    Nueva conversación
                  </button>
                  <div className="sidebar-block">
                    <p className="sidebar-title">Tu cuenta</p>
                    {session ? (
                      <>
                        <p className="sidebar-email">{userInfo?.email || 'Cuenta activa'}</p>
                        <span className={`user-plan ${userInfo?.isPro ? 'pro' : 'free'}`}>
                          {userInfo?.isPro ? 'Pro' : 'Gratis'}
                        </span>
                        {userLoading ? (
                          <p className="sidebar-status">Actualizando datos...</p>
                        ) : userInfo ? (
                          <div className="sidebar-metrics">
                            <div>
                              <p className="user-panel-label">Límite diario</p>
                              <p className="user-panel-value">{userInfo.dailyLimit}</p>
                            </div>
                            <div>
                              <p className="user-panel-label">Usados hoy</p>
                              <p className="user-panel-value">{userInfo.dailyCount}</p>
                            </div>
                            <div>
                              <p className="user-panel-label">Fecha</p>
                              <p className="user-panel-value">{userInfo.date}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="sidebar-status">No pudimos cargar tus datos.</p>
                        )}
                        <div className="sidebar-actions">
                          {subscriptionInfo?.hasSubscription ? (
                            <>
                              <button className="ghost small" type="button" onClick={() => handleSubscriptionAction('pause')}>
                                Pausar
                              </button>
                              <button className="ghost small" type="button" onClick={() => handleSubscriptionAction('resume')}>
                                Reanudar
                              </button>
                              <button className="ghost small danger" type="button" onClick={() => handleSubscriptionAction('cancel')}>
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <button className="ghost small" type="button" onClick={handleSubscribe}>
                              Gestionar suscripción
                            </button>
                          )}
                          {subscriptionStatus && (
                            <p className="user-panel-status">{subscriptionStatus}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="access-card">
                        <p className="access-title">Accede a tu cuenta</p>
                        <p className="access-text">Guarda tu historial y desbloquea el plan Pro.</p>
                        <button className="cta" type="button" onClick={() => setAuthOpen(true)}>
                          Iniciar sesion
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="sidebar-block">
                    <p className="sidebar-title">Historial</p>
                    {historyLoading ? (
                      <p className="sidebar-status">Cargando historial...</p>
                    ) : historyDisplay.length ? (
                      <ul className="sidebar-history">
                        {historyDisplay.map((item) => (
                          <li key={item.id}>
                            <span className="history-title">{formatHistoryTitle(item.text)}</span>
                            <button
                              className="history-delete"
                              type="button"
                              onClick={() => handleDeleteHistory(item.id)}
                              aria-label="Eliminar conversación"
                            >
                              🗑
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="sidebar-status">Todavía no hay mensajes.</p>
                    )}
                    {historyStatus && <p className="sidebar-status">{historyStatus}</p>}
                  </div>
                </aside>
                <div className="chat-shell">
                  {!supabaseReady ? (
                    <div className="auth-panel">
                      <div className="auth-header">
                        <h3>Configuración pendiente</h3>
                        <p>Faltan variables de entorno de Supabase en Netlify.</p>
                      </div>
                    </div>
                  ) : isRecovery ? (
                    <ResetPasswordPanel />
                  ) : (
                    <ChatBot accessToken={session?.access_token} />
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="contexto" className="section story">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Contexto</p>
              <h2>Una IA con memoria historica.</h2>
              <p className="section-lead">
                No es un chatbot cualquiera. Es una reconstruccion de voz y pensamiento,
                entrenada con fuentes reales para hablar como Peron.
              </p>
            </div>
            
            <div className="story-cards">
              <div className="story-card">
                <span className="story-tag">01</span>
                <h3>Entrenamiento real</h3>
                <p>Discursos, documentos y cartas autenticas.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">02</span>
                <h3>Voz coherente</h3>
                <p>Responde con el estilo y el lenguaje de la epoca.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">03</span>
                <h3>Uso ciudadano</h3>
                <p>Pensada para dialogar, aprender y debatir con identidad.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="propuesta" className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Propuesta</p>
              <h2>Una experiencia unica, con rigor historico.</h2>
              <p className="section-lead">
                Un asistente entrenado para hablar como Peron, con datos reales y una voz reconocible.
              </p>
            </div>
            
            <div className="program-grid">
              <article className="program-card">
                <div className="program-icon">>>></div>
                <h3>Entrenamiento historico</h3>
                <p>Base documental curada para mayor fidelidad.</p>
                <span className="program-tag">Claro</span>
              </article>
              <article className="program-card">
                <div className="program-icon">>>></div>
                <h3>Respuesta en personaje</h3>
                <p>Tono y estilo consistentes en cada respuesta.</p>
                <span className="program-tag">Confianza</span>
              </article>
              <article className="program-card">
                <div className="program-icon">>>></div>
                <h3>Acceso simple</h3>
                <p>Entras, preguntas, y conversas al instante.</p>
                <span className="program-tag">Accion</span>
              </article>
            </div>
          </div>
        </section>

        <section id="impacto" className="section">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Impacto</p>
              <h2>Una forma nueva de aprender historia.</h2>
              <p className="section-lead">
                Mas cercano, mas directo y mas nuestro.
              </p>
            </div>
            
            <div className="impact-grid">
              <div className="impact-card">
                <p className="impact-number">+68%</p>
                <p className="impact-label">Conversacion mas clara</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">3x</p>
                <p className="impact-label">Mas participacion</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">24h</p>
                <p className="impact-label">Acceso inmediato</p>
              </div>
            </div>
          </div>
        </section>

        <section id="planes" className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Planes</p>
              <h2>Elegi tu forma de participar.</h2>
              <p className="section-lead">
                Acceso inmediato con el plan gratis o desbloquea historial completo con Pro.
              </p>
            </div>
            <div className="program-grid">
              <div className="plan-card">
                <p className="plan-title">Plan Gratis</p>
                <p className="plan-price">$0</p>
                <p className="plan-detail">3 preguntas por dia - Acceso inmediato</p>
              </div>
              <div className="plan-card pro">
                <p className="plan-title">Plan Pro</p>
                <p className="plan-price">$7.500 ARS / mes</p>
                <p className="plan-detail">Ilimitado - Historial - Prioridad</p>
                <button className="cta pro-cta" type="button" onClick={handleSubscribe}>
                  Quiero Pro
                </button>
                {subscribeStatus && <p className="plan-status">{subscribeStatus}</p>}
              </div>
            </div>
          </div>
        </section>

        
      </main>

      {authOpen && !session && (
        <div
          className="auth-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setAuthOpen(false)}
        >
          <div className="auth-modal" onClick={(event) => event.stopPropagation()}>
            <div className="auth-modal-header">
              <div>
                <p className="auth-modal-title">Ingresa a tu cuenta</p>
                <p className="auth-modal-subtitle">Continua la conversacion con acceso completo.</p>
              </div>
              <button className="auth-modal-close" type="button" onClick={() => setAuthOpen(false)}>
                Cerrar
              </button>
            </div>
            <AuthPanel onAuth={(nextSession) => {
              setSession(nextSession);
              setAuthOpen(false);
            }} />
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Proyecto PERON - IA historica con identidad.</p>
          <div className="footer-links">
            <a href="#contexto">Contexto</a>
            <a href="#propuesta">Propuesta</a>
            <a href="#impacto">Impacto</a>
            <a href="#chat">Chat</a>
            <a href="#planes">Planes</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

