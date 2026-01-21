import ChatBot from './components/ChatBot';
import './App.css';

function App() {
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
            <a href="#vision">Visión</a>
            <a href="#programa">Programa</a>
            <a href="#chat">Chat</a>
          </nav>
          <a className="cta small" href="#chat">Sumarse</a>
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

        <section id="vision" className="section">
          <div className="container section-grid">
            <div>
              <p className="section-eyebrow">Visión</p>
              <h2>Una narrativa visual con orgullo nacional.</h2>
              <p className="section-lead">
                Tonos celestes y blancos, tipografías expresivas y composición dinámica
                para transmitir estabilidad, modernidad y pertenencia.
              </p>
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <h3>Estética contemporánea</h3>
                <p>Capas, brillos suaves y detalles gráficos con estructura editorial.</p>
              </div>
              <div className="feature-card">
                <h3>Patriotismo sobrio</h3>
                <p>Iconografía inspirada en símbolos nacionales sin caer en clichés.</p>
              </div>
              <div className="feature-card">
                <h3>Información clara</h3>
                <p>Jerarquías fuertes para comunicar con claridad y dirección.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="programa" className="section alt">
          <div className="container">
            <div className="section-header">
              <p className="section-eyebrow">Programa</p>
              <h2>Compromisos visibles, medibles y humanos.</h2>
              <p className="section-lead">
                Cada bloque está pensado para impulsar acción cívica con estética fuerte
                y mensajes directos.
              </p>
            </div>
            <div className="program-grid">
              <article className="program-card">
                <div className="program-icon">⚙</div>
                <h3>Trabajo y producción</h3>
                <p>Iniciativas para potenciar industria local y empleo digno.</p>
                <span className="program-tag">Plan 01</span>
              </article>
              <article className="program-card">
                <div className="program-icon">✶</div>
                <h3>Unidad federal</h3>
                <p>Coordinación regional con identidad y autonomía.</p>
                <span className="program-tag">Plan 02</span>
              </article>
              <article className="program-card">
                <div className="program-icon">◎</div>
                <h3>Desarrollo social</h3>
                <p>Redes de cuidado y cercanía en todo el territorio.</p>
                <span className="program-tag">Plan 03</span>
              </article>
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
                <strong>Voz histórica disponible</strong>
              </div>
            </div>
            <div className="chat-shell">
              <ChatBot />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <p>Proyecto PERON · Identidad nacional, diseño contemporáneo.</p>
          <div className="footer-links">
            <a href="#vision">Visión</a>
            <a href="#programa">Programa</a>
            <a href="#chat">Chat</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
