import { useEffect, useState } from 'react';
import ChatBot from './components/ChatBot';
import AuthPanel from './components/AuthPanel';
import ResetPasswordPanel from './components/ResetPasswordPanel';
import { supabase } from './lib/supabaseClient';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    setIsRecovery(window.location.hash.includes('type=recovery'));
    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
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
              <h1>Una interfaz contemporánea con identidad nacional.</h1>
              <p className="lead">
                Diseño sólido, claro y patriótico para comunicar propuestas con autoridad,
                cercanía y una estética inconfundible.
              </p>
              <div className="hero-actions">
                <a className="cta" href="#chat">Iniciar conversación</a>
                <a className="ghost" href="#programa">Conocer el plan</a>
              </div>
              <div className="stats">
                <div className="stat-card">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Asistencia ciudadana</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">+120</span>
                  <span className="stat-label">Propuestas priorizadas</span>
                </div>
                <div className="stat-card">
                  <span className="stat-number">100%</span>
                  <span className="stat-label">Diseño soberano</span>
                </div>
              </div>
            </div>
            <div className="hero-panel">
              <div className="sun-badge">
                <span>Sol de la patria</span>
                <strong>1945</strong>
              </div>
              <div className="panel-card">
                <p className="panel-title">Agenda estratégica</p>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Industria & trabajo</p>
                    <p className="panel-text">Ejes productivos con foco federal.</p>
                  </div>
                </div>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Innovación pública</p>
                    <p className="panel-text">Tecnología al servicio del pueblo.</p>
                  </div>
                </div>
                <div className="panel-row">
                  <span className="panel-dot" />
                  <div>
                    <p className="panel-heading">Unidad nacional</p>
                    <p className="panel-text">Diálogo y cohesión social.</p>
                  </div>
                </div>
              </div>
              <div className="panel-footer">
                <span className="pill">Identidad</span>
                <span className="pill">Transparencia</span>
                <span className="pill">Futuro</span>
              </div>
            </div>
          </div>
        </section>

        <section id="contexto" className="section story">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Contexto</p>
              <h2>Una historia que empieza en la calle y termina en decisión.</h2>
              <p className="section-lead">
                La gente necesita claridad, dirección y una identidad que ordene la conversación.
                Convertimos el relato en acción con una plataforma hecha para convencer.
              </p>
            </div>
            <div className="story-cards">
              <div className="story-card">
                <span className="story-tag">01</span>
                <h3>Dolor real</h3>
                <p>Confusión informativa y falta de liderazgo visible.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">02</span>
                <h3>Oportunidad</h3>
                <p>Una narrativa moderna que devuelve confianza.</p>
              </div>
              <div className="story-card">
                <span className="story-tag">03</span>
                <h3>Acción</h3>
                <p>Herramientas digitales listas para escalar.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="propuesta" className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Propuesta</p>
              <h2>Un motor comercial con corazón patriótico.</h2>
              <p className="section-lead">
                Arquitectura de storytelling diseñada para convertir curiosidad en apoyo
                y apoyo en adhesión.
              </p>
            </div>
            <div className="program-grid">
              <article className="program-card">
                <div className="program-icon">⚡</div>
                <h3>Mensaje principal</h3>
                <p>Un claim claro y repetible que activa interés inmediato.</p>
                <span className="program-tag">Gancho</span>
              </article>
              <article className="program-card">
                <div className="program-icon">◎</div>
                <h3>Prueba social</h3>
                <p>Métricas y logros visibles para generar confianza.</p>
                <span className="program-tag">Confianza</span>
              </article>
              <article className="program-card">
                <div className="program-icon">✶</div>
                <h3>Conversión</h3>
                <p>CTA claros para captar apoyo y participación.</p>
                <span className="program-tag">Acción</span>
              </article>
            </div>
          </div>
        </section>

        <section id="impacto" className="section">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Impacto</p>
              <h2>Resultados que se ven, se entienden y se comparten.</h2>
              <p className="section-lead">
                Una web pensada para destacar beneficios tangibles y sostener una presencia
                comercial de alto impacto.
              </p>
            </div>
            <div className="impact-grid">
              <div className="impact-card">
                <p className="impact-number">+68%</p>
                <p className="impact-label">Mayor retención del mensaje</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">3x</p>
                <p className="impact-label">Interacción con el chat</p>
              </div>
              <div className="impact-card">
                <p className="impact-number">24h</p>
                <p className="impact-label">Conversación permanente</p>
              </div>
            </div>
          </div>
        </section>

        <section id="chat" className="section chat-section">
          <div className="container chat-grid">
            <div className="chat-intro">
              <p className="section-eyebrow">Chat ciudadano</p>
              <h2>Conversá con el General en tiempo real.</h2>
              <p className="section-lead">
                Un asistente entrenado para responder consultas, compartir ideas y
                mantener viva la conversación con la historia.
              </p>
              <div className="chat-callout">
                <span>Respuesta inmediata</span>
                <strong>Conversión garantizada con mensajes claros</strong>
              </div>
              <div className="plan-card">
                <p className="plan-title">Plan Gratis</p>
                <p className="plan-price">$0</p>
                <p className="plan-detail">3 preguntas por día · Acceso inmediato</p>
              </div>
              <div className="plan-card pro">
                <p className="plan-title">Plan Pro</p>
                <p className="plan-price">$7.500 ARS / mes</p>
                <p className="plan-detail">Ilimitado · Historial completo · Prioridad</p>
              </div>
            </div>
            <div className="chat-shell">
              {isRecovery ? (
                <ResetPasswordPanel />
              ) : session ? (
                <ChatBot accessToken={session.access_token} />
              ) : (
                <AuthPanel onAuth={setSession} />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Proyecto PERON · Identidad nacional, diseño contemporáneo.</p>
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
