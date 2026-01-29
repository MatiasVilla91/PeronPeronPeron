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
  const [activeSection, setActiveSection] = useState('chat');
  const defaultChat = [
    { role: 'peron', text: '¡Hola compañero! ¿En qué puedo ayudarte hoy?' }
  ];
  const [chatMessages, setChatMessages] = useState(defaultChat);

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
    const sectionIds = ['chat', 'contexto', 'propuesta', 'impacto', 'planes', 'privacidad'];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) {
        setActiveSection(visible[0].target.id);
      }
    }, { threshold: [0.2, 0.35, 0.5, 0.7] });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

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
      setSubscribeStatus('Iniciá sesión para suscribirte al Plan Pro.');
      setAuthOpen(true);
      return;
    }

    try {
      setSubscribeStatus('Generando suscripción...');
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
        const detail = data?.details || rawText || 'Probá de nuevo.';
        setSubscribeStatus(`No pudimos iniciar la suscripción. ${detail}`);
        return;
      }
      window.location.href = data.init_point;
    } catch (error) {
      setSubscribeStatus('No pudimos iniciar la suscripción. Probá de nuevo.');
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
        setSubscriptionStatus('No pudimos actualizar la suscripción.');
        return;
      }
      setSubscriptionStatus(`Estado actualizado: ${data.status}`);
      setSubscriptionInfo((prev) => prev ? { ...prev, status: data.status, hasSubscription: true } : prev);
    } catch (error) {
      setSubscriptionStatus('No pudimos actualizar la suscripción.');
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

  const resetChat = () => {
    setChatMessages(defaultChat);
  };

  const loadHistoryConversation = (id) => {
    const ordered = [...historyItems]
      .filter((item) => item?.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const startIndex = ordered.findIndex((item) => item.id === id);
    if (startIndex === -1) return;
    let endIndex = ordered.length;
    for (let i = startIndex + 1; i < ordered.length; i += 1) {
      if (ordered[i].role === 'user') {
        endIndex = i;
        break;
      }
    }
    const segment = ordered.slice(startIndex, endIndex);
    if (!segment.length) return;
    setChatMessages(segment.map((item) => ({
      role: item.role || 'user',
      text: item.text || ''
    })));
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
          <nav className="nav" aria-label="Secciones principales">
            <a className={activeSection === 'chat' ? 'active' : ''} href="#chat">Chat</a>
            <a className={activeSection === 'contexto' ? 'active' : ''} href="#contexto">Contexto</a>
            <a className={activeSection === 'propuesta' ? 'active' : ''} href="#propuesta">Propuesta</a>
            <a className={activeSection === 'impacto' ? 'active' : ''} href="#impacto">Impacto</a>
            <a className={activeSection === 'planes' ? 'active' : ''} href="#planes">Planes</a>
            <a className={activeSection === 'privacidad' ? 'active' : ''} href="#privacidad">Privacidad</a>
          </nav>
          <div className="header-actions">
            {session ? (
              <>
                <div className="user-menu">
                  <button
                    className="user-trigger"
                    type="button"
                    aria-label="Ver tu cuenta"
                    aria-haspopup="true"
                  >
                    <span aria-hidden="true">👤</span>
                  </button>
                  <div className="user-menu-popover">
                    <div className="user-menu-header">
                      <p className="user-menu-title">Tu cuenta</p>
                      <span className={`user-plan ${userInfo?.isPro ? 'pro' : 'free'}`}>
                        {userInfo?.isPro ? 'Pro' : 'Gratis'}
                      </span>
                    </div>
                    <p className="user-menu-email">{userInfo?.email || 'Cuenta activa'}</p>
                    {userLoading ? (
                      <p className="user-menu-status">Actualizando datos...</p>
                    ) : userInfo ? (
                      <div className="user-menu-metrics">
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
                      <p className="user-menu-status">No pudimos cargar tus datos.</p>
                    )}
                    <div className="user-menu-actions">
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
                  </div>
                </div>
                <button className="ghost small" onClick={handleSignOut}>Salir</button>
              </>
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
              <p className="eyebrow">IA entrenada con Perón - Archivo vivo - Presente humano</p>
              <h1>Conversá con el Perón de hoy.</h1>
              <p className="lead">
                Creamos una IA entrenada con discursos, cartas y documentos reales de Juan Domingo Perón.
                Responde en su estilo, con claridad y convicción, para ayudarte a entender el presente desde una mirada histórica.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#chat">Quiero conversar</a>
                <a className="ghost" href="#propuesta">Ver cómo funciona</a>
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
              <h2>Probá ahora.</h2>
              <p className="section-lead">
                Hacé una pregunta y recibí una respuesta con identidad peronista.
              </p>
              <div className="chat-callout">
                <span>Respuestas con fuentes</span>
                <strong>Estilo auténtico y documentado</strong>
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
                  <button className="new-chat" type="button" onClick={resetChat}>
                    Nueva conversación
                  </button>
                  <div className="sidebar-block">
                    <p className="sidebar-title">Historial</p>
                    {historyLoading ? (
                      <p className="sidebar-status">Cargando historial...</p>
                    ) : historyDisplay.length ? (
                      <ul className="sidebar-history">
                        {historyDisplay.map((item) => (
                          <li key={item.id}>
                            <span className="history-title" onClick={() => loadHistoryConversation(item.id)}>{formatHistoryTitle(item.text)}</span>
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
                    <ChatBot accessToken={session?.access_token} chat={chatMessages} setChat={setChatMessages} />
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
              <h2>Una IA con memoria histórica.</h2>
              <p className="section-lead">
                No es un chatbot cualquiera. Es una reconstrucción de ideas y pensamiento,
                entrenada con fuentes reales para hablar como Perón.
              </p>
            </div>
            
            <div className="story-cards">
              <div className="story-card">
                <span className="story-tag">01</span>
                <h3>Entrenamiento real</h3>
                <p>Discursos, documentos y cartas auténticas.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">02</span>
                <h3>Estilo coherente</h3>
                <p>Responde con el tono y el lenguaje de la época.</p>
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
              <h2>Una experiencia única, con rigor histórico.</h2>
              <p className="section-lead">
                Un asistente entrenado para hablar como Perón, con datos reales y un estilo reconocible.
              </p>
            </div>
            
            <div className="program-grid">
              <article className="program-card">
                <div className="program-icon">>>></div>
                <h3>Entrenamiento histórico</h3>
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
                <p>Entrás, preguntás y conversás al instante.</p>
                <span className="program-tag">Acción</span>
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
                Más cercano, más directo y más nuestro.
              </p>
            </div>
            
            <div className="impact-grid">
              <div className="impact-card">
                <p className="impact-number">+68%</p>
                <p className="impact-label">Conversación más clara</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">3x</p>
                <p className="impact-label">Más participación</p>
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
              <h2>Elegí tu forma de participar.</h2>
              <p className="section-lead">
                Acceso inmediato con el plan gratis o desbloqueá historial completo con Pro.
              </p>
            </div>
            <div className="program-grid">
              <div className="plan-card">
                <p className="plan-title">Plan Gratis</p>
                <p className="plan-price">$0</p>
                <p className="plan-detail">3 preguntas por día - Acceso inmediato</p>
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

        <section id="privacidad" className="section privacy-section">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Privacidad</p>
              <h2>Política de privacidad.</h2>
              <p className="section-lead">
                Última actualización: 27/01/2026. Resumen breve con detalles opcionales.
              </p>
              <div className="privacy-note">
                <p>
                  Importante: este bot es una recreación basada en documentos históricos. No es Juan Domingo Perón real.
                </p>
              </div>
            </div>
            <details className="privacy-details">
              <summary>Ver resumen completo</summary>
              <div className="privacy-card">
                <h3>Qué datos podemos recopilar</h3>
                <ul>
                  <li>Mensajes enviados al chat y respuestas generadas.</li>
                  <li>Datos técnicos básicos (fecha/hora, navegador, IP aproximada).</li>
                  <li>Si creas cuenta, tu email y datos de sesión.</li>
                </ul>
                <h3>Para qué los usamos</h3>
                <ul>
                  <li>Operar el servicio y mejorar la calidad de las respuestas.</li>
                  <li>Seguridad, diagnóstico de fallas y prevención de abuso.</li>
                </ul>
                <h3>Entrenamiento y opt-out</h3>
                <p>
                  Si no querés que usemos tus mensajes para mejorar el sistema, escribinos y los excluimos.
                </p>
                <h3>Retencion</h3>
                <p>
                  Todavía no definimos un plazo fijo. Vamos a conservar los datos el mínimo tiempo necesario y publicaremos el plazo aquí.
                </p>
                <h3>Terceros</h3>
                <p>
                  Usamos proveedores para operar el servicio, como Supabase (autenticación/base de datos) y OpenAI (modelo de lenguaje).
                </p>
                <h3>Contacto</h3>
                <p>
                  Para consultas o solicitudes de borrado: soporte@peronperon.site
                </p>
              </div>
            </details>
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
                <p className="auth-modal-title">Ingresá a tu cuenta</p>
                <p className="auth-modal-subtitle">Continuá la conversación con acceso completo.</p>
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
          <p>Proyecto PERON - IA histórica con identidad.</p>
          <div className="footer-links">
            <a href="#contexto">Contexto</a>
            <a href="#propuesta">Propuesta</a>
            <a href="#impacto">Impacto</a>
            <a href="#chat">Chat</a>
            <a href="#planes">Planes</a>
            <a href="#privacidad">Privacidad</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

