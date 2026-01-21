import { useEffect, useState } from 'react';
import ChatBot from './components/ChatBot';
import AuthPanel from './components/AuthPanel';
import ResetPasswordPanel from './components/ResetPasswordPanel';
import { supabase, supabaseReady } from './lib/supabaseClient';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [userLoading, setUserLoading] = useState(false);

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
    const fetchUser = async () => {
      if (!session?.access_token) {
        setUserInfo(null);
        return;
      }
      try {
        setUserLoading(true);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/me`, {
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

  const handleSignOut = async () => {
    if (supabaseReady) {
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  const handleSubscribe = async () => {
    setSubscribeStatus('');
    if (!session?.access_token) {
      setSubscribeStatus('IniciÃ¡ sesiÃ³n para suscribirte al Plan Pro.');
      const panel = document.getElementById('auth-panel');
      panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    try {
      setSubscribeStatus('Generando suscripciÃ³n...');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/subscribe`, {
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
      setSubscribeStatus('No pudimos iniciar la suscripciÃ³n. ProbÃ¡ de nuevo.');
    }
  };

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
            <a href="#contexto">Contexto</a>
            <a href="#propuesta">Propuesta</a>
            <a href="#impacto">Impacto</a>
            <a href="#chat">Chat</a>
          </nav>
          <div className="header-actions">
            {session ? (
              <button className="ghost small" onClick={handleSignOut}>Salir</button>
            ) : (
              <a className="cta small" href="#chat">Sumarse</a>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Soberanía · Justicia social · Independencia económica</p>
              <h1>Hablemos claro, entre nosotros.</h1>
              <p className="lead">
                Esta plataforma está pensada para vos: directa, cercana y con identidad.
                Queremos que la conversación sea simple, útil y bien nuestra.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#chat">Quiero conversar</a>
                <a className="ghost" href="#propuesta">Ver la propuesta</a>
              </div>
              <div className="stats">
                <div className="stat-card">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Acompañamiento siempre</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">+120</span>
                  <span className="stat-label">Ideas en marcha</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Identidad popular</span>
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

        <section id="contexto" className="section story">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Contexto</p>
              <h2>La historia arranca en la calle.</h2>
              <p className="section-lead">
                Todos queremos lo mismo: que nos escuchen y que las cosas mejoren.
                Acá la conversación es simple y directa, sin vueltas.
              </p>
            </div>
            <div className="story-cards">
              <div className="story-card">
                <span className="story-tag">01</span>
                <h3>Lo que duele</h3>
                <p>Demasiado ruido, poca claridad y promesas que no llegan.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">02</span>
                <h3>Lo que queremos</h3>
                <p>Información clara, respuestas rápidas y un rumbo firme.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">03</span>
                <h3>Lo que hacemos</h3>
                <p>Una herramienta simple para conversar y decidir mejor.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="propuesta" className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Propuesta</p>
              <h2>Una propuesta clara, con identidad y rumbo.</h2>
              <p className="section-lead">
                Explicamos lo importante de forma simple para que cualquiera lo entienda,
                lo comparta y lo haga propio.
              </p>
            </div>
            <div className="program-grid">
              <article className="program-card">
                <div className="program-icon">⚡</div>
                <h3>Mensaje directo</h3>
                <p>Una idea central que se entiende en dos líneas.</p>
                <span className="program-tag">Claro</span>
              </article>
              <article className="program-card">
                <div className="program-icon">◎</div>
                <h3>Confianza real</h3>
                <p>Hechos y datos que hablan por sí solos.</p>
                <span className="program-tag">Confianza</span>
              </article>
              <article className="program-card">
                <div className="program-icon">✶</div>
                <h3>Participación</h3>
                <p>Sumarse es simple, rápido y sin trabas.</p>
                <span className="program-tag">Acción</span>
              </article>
            </div>
          </div>
        </section>

        <section id="impacto" className="section">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Impacto</p>
              <h2>Resultados que se notan.</h2>
              <p className="section-lead">
                No es solo diseño: es una forma de contar mejor lo que hacemos
                y de sumar a más gente todos los días.
              </p>
            </div>
            <div className="impact-grid">
              <div className="impact-card">
                <p className="impact-number">+68%</p>
                <p className="impact-label">Más gente entiende el mensaje</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">3x</p>
                <p className="impact-label">Más conversación real</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">24h</p>
                <p className="impact-label">Respuesta siempre disponible</p>
              </div>
            </div>
          </div>
        </section>

        <section id="chat" className="section chat-section">
          <div className="container chat-grid">
            <div className="chat-intro">
              <p className="section-eyebrow">Chat ciudadano</p>
              <h2>Hablemos como corresponde, sin vueltas.</h2>
              <p className="section-lead">
                Este espacio es para preguntar, opinar y entender mejor.
                Estamos para escucharte y responderte.
              </p>
              <div className="chat-callout">
                <span>Respuesta inmediata</span>
                <strong>Un canal directo con voz cercana</strong>
              </div>
              <div className="plan-card">
                <p className="plan-title">Plan Gratis</p>
                <p className="plan-price">$0</p>
                <p className="plan-detail">3 preguntas por día · Sin vueltas</p>
              </div>
              <div className="plan-card pro">
                <p className="plan-title">Plan Pro</p>
                <p className="plan-price">$7.500 ARS / mes</p>
                <p className="plan-detail">Ilimitado · Historial · Prioridad</p>
                <button className="cta pro-cta" type="button" onClick={handleSubscribe}>
                  Quiero Pro
                </button>
                {subscribeStatus && <p className="plan-status">{subscribeStatus}</p>}
              </div>
            </div>
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
                <>
                  <ChatBot accessToken={session?.access_token} />
                  {session && (
                    <div className="user-panel">
                      <div className="user-panel-header">
                        <div>
                          <p className="user-panel-title">Tu cuenta</p>
                          <p className="user-panel-email">{userInfo?.email || 'Cuenta activa'}</p>
                        </div>
                        <span className={`user-plan ${userInfo?.isPro ? 'pro' : 'free'}`}>
                          {userInfo?.isPro ? 'Pro' : 'Gratis'}
                        </span>
                      </div>
                      {userLoading ? (
                        <p className="user-panel-status">Actualizando datos...</p>
                      ) : userInfo ? (
                        <div className="user-panel-grid">
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
                        <p className="user-panel-status">No pudimos cargar tus datos.</p>
                      )}
                    </div>
                  )}
                  {!session && (
                    <div className="auth-cta" id="auth-panel">
                      <p>Si te gustó, creá tu cuenta y accedé al plan Pro.</p>
                      <AuthPanel onAuth={setSession} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Proyecto PERON · Hecho con identidad y cercanía.</p>
          <div className="footer-links">
            <a href="#contexto">Contexto</a>
            <a href="#propuesta">Propuesta</a>
            <a href="#impacto">Impacto</a>
            <a href="#chat">Chat</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
