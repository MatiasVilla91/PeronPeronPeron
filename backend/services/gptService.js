// services/gptService.js
const axios = require("axios");

const OPENAI_API_URL            = process.env.OPENAI_API_URL   || "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL              = process.env.OPENAI_MODEL     || "gpt-4o-mini";
const STYLE_REWRITE_ENABLED     = process.env.STYLE_REWRITE_ENABLED === "1";
const STYLE_REWRITE_MODEL       = process.env.STYLE_REWRITE_MODEL || OPENAI_MODEL;
const STYLE_REWRITE_MAX_TOKENS  = Number(process.env.STYLE_REWRITE_MAX_TOKENS || 420);
const STYLE_REWRITE_TEMPERATURE = Number(process.env.STYLE_REWRITE_TEMPERATURE || 0.3);

const AXIOS = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  timeout: 28_000
});

// ── Helpers ───────────────────────────────────────────────────
function truncate(text = "", maxChars = 1200) {
  if (!text || text.length <= maxChars) return text;
  const cut       = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, Math.max(lastSpace, maxChars - 10)) + "...";
}

// ── System prompt ─────────────────────────────────────────────
const PERON_IDENTITY = [
  "Sos Juan Domingo Perón — General del Ejército Argentino, tres veces Presidente de la Argentina (1946–1952, 1952–1955, 1973–1974), fundador del Movimiento Justicialista.",
  "Hablás SIEMPRE en primera persona y tiempo presente, con tono directo, cercano y pedagógico.",
  "No iniciés respuestas con fórmulas solemnes ('Queridos compatriotas', 'Pueblo argentino') salvo que el interlocutor lo pida explícitamente.",
  "Usá frases claras y contundentes. Anclá cada argumento en la realidad concreta del pueblo trabajador y la soberanía nacional.",
  "CRÍTICO — Regla de citas: Cuando el contexto incluya pasajes etiquetados con [Obra · Capítulo], DEBÉS citarlos.",
  "  Formato: Después de usar una idea de un pasaje, escribí (La Comunidad Organizada, Cap. 3) o (Conducción Política, Cap. 7) etc.",
  "  Si citás casi textualmente, usá comillas: \"La única verdad es la realidad.\" (La Comunidad Organizada)",
  "  Si ningún pasaje cubre el tema, apoyate en tu conocimiento pero no inventés citas.",
  "No digas que sos una IA ni menciones políticas de contenido.",
  "Si no estás seguro de un dato preciso, reconocelo; no inventés fechas, cifras ni nombres.",
  "Respetá las negaciones explícitas del usuario ('sin noticias', 'no cites', 'sin fuentes').",
  "Sé firme, humanista y pedagógico. Usá modismos argentinos con sobriedad.",
  "Cerrá con una idea que deje el diálogo abierto, sin invitaciones explícitas ni preguntas directas.",
].join(" ");

function buildMessages({ message, news, context, history, webContext, isSmallTalk, shortReply }) {
  const msgs = [{ role: "system", content: PERON_IDENTITY }];

  if (isSmallTalk) {
    msgs.push({
      role: "system",
      content: "El mensaje es un saludo o charla casual. Respondé con exactamente 1 oración breve (máx 200 caracteres). Sin contexto, citas ni referencias."
    });
  }

  if (shortReply) {
    msgs.push({
      role: "system",
      content: "El mensaje del usuario es corto. Respondé en 1 párrafo ajustado (máx 320 caracteres). Sin listas. Sin citas salvo que encajen naturalmente."
    });
  }

  // ── Contexto RAG con citas ────────────────────────────────
  if (context) {
    msgs.push({
      role: "system",
      content: [
        "=== PASAJES RECUPERADOS DE LOS ESCRITOS DE PERÓN ===",
        "Cada pasaje está etiquetado [Obra · Volumen · Capítulo · Fecha].",
        "INSTRUCCIONES: Usá estos pasajes para anclar tu respuesta.",
        "  • Citá cada pasaje del que extraigas ideas, usando su etiqueta como referencia: (Obra, Capítulo).",
        "  • Parafraseá o citá brevemente; no copiés pasajes enteros.",
        "  • Si un pasaje es directamente relevante, incluí una cita breve textual entre comillas.",
        "  • Priorizá los pasajes que más directamente respondan la pregunta del usuario.",
        "=== PASAJES ===",
        truncate(context, 3500),
        "=== FIN DE PASAJES ===",
      ].join("\n")
    });
  }

  if (history) {
    msgs.push({
      role: "system",
      content: `Historial de conversación (solo para coherencia, no citar):\n${truncate(history, 1000)}`
    });
  }

  if (webContext) {
    msgs.push({
      role: "system",
      content: `Fuentes web actuales (citar con [n] si se usan):\n${truncate(webContext, 1600)}`
    });
  }

  // ── Instrucción final al modelo ───────────────────────────
  const newsBlock = news ? `\n\n[Noticias recientes]\n${truncate(news, 800)}` : "";

  let responseRule;
  if (isSmallTalk) {
    responseRule = "Respondé con 1 oración (máx 200 caracteres). Sin citas.";
  } else if (shortReply) {
    responseRule = "Respondé en 1 párrafo (máx 320 caracteres). Citá si un pasaje aplica claramente.";
  } else {
    responseRule = [
      "Respondé como Perón en 2–3 párrafos (máx 1100 caracteres en total).",
      "Estructura: (1) planteá la tensión o el problema; (2) desarrollá con evidencia de los pasajes; (3) sintetizá con la visión justicialista.",
      "Incluí al menos una cita en el texto (Obra, Capítulo) si hay un pasaje relevante.",
      "NO incluyas sección de bibliografía — tejé las citas en el cuerpo del texto.",
      "Cerrá con una idea que mantenga el diálogo abierto.",
    ].join(" ");
  }

  const noSources = !webContext ? "No agregues 'Fuentes:' ni cites [n] (no se proporcionó contexto web)." : "";

  msgs.push({
    role: "user",
    content: `Interlocutor: "${message}"${newsBlock}\n\n${responseRule} ${noSources}`.trim()
  });

  return msgs;
}

// ── Style rewrite ─────────────────────────────────────────────
function buildRewriteMessages(draft = "") {
  return [
    {
      role: "system",
      content: [
        "Reescribí el texto siguiente en la voz auténtica de Juan Domingo Perón.",
        "Preservá TODAS las citas en el texto como (La Comunidad Organizada, Cap. 3) o [1] exactamente como aparecen.",
        "Mantené el contenido factual; no agregués ni eliminés datos.",
        "1–3 párrafos. Cerrá con una idea dialécticamente abierta.",
        "No iniciés con saludos solemnes salvo que ya estén en el original.",
      ].join(" ")
    },
    { role: "user", content: `Texto:\n${truncate(draft, 2800)}` }
  ];
}

// ── Web source linkification ──────────────────────────────────
function extractSources(webContext = "") {
  const map = new Map();
  for (const line of String(webContext).split("\n")) {
    const m = line.match(/^\[(\d+)\]\s.+\((https?:\/\/[^)]+)\)\s*$/);
    if (m) map.set(m[1], m[2]);
  }
  return map;
}

function linkifySources(text = "", webContext = "") {
  const sources = extractSources(webContext);
  if (!text || !sources.size) return text;
  return text.replace(/\[(\d+)\]/g, (full, num) => {
    const url = sources.get(num);
    return url ? `[${num}](${url})` : full;
  });
}

// ── OpenAI call with retry ────────────────────────────────────
async function callOpenAI(payload, maxRetries = 2) {
  let attempt = 0, delay = 800;
  while (true) {
    try {
      const { data } = await AXIOS.post("", payload);
      return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (err) {
      const status = err?.response?.status;
      if (attempt >= maxRetries || ![429, 500, 502, 503, 504].includes(status)) {
        console.error("Error OpenAI:", err.response?.data || err.message);
        throw err;
      }
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
      attempt++;
    }
  }
}

// ── Main export ───────────────────────────────────────────────
async function getResponseFromGPT(message, news = "", context = "", history = "", webContext = "", options = {}) {
  const messages = buildMessages({
    message, news, context, history, webContext,
    isSmallTalk: options.isSmallTalk,
    shortReply:  options.shortReply,
  });

  const payload = {
    model:             OPENAI_MODEL,
    messages,
    max_tokens:        options.isSmallTalk ? 90 : options.shortReply ? 150 : 380,
    temperature:       0.35,
    top_p:             0.9,
    presence_penalty:  0.2,
    frequency_penalty: 0.3,
  };

  try {
    let text = await callOpenAI(payload);

    if (STYLE_REWRITE_ENABLED && text && !options.shortReply && !options.isSmallTalk) {
      const rewritePayload = {
        model:       STYLE_REWRITE_MODEL,
        messages:    buildRewriteMessages(text),
        max_tokens:  STYLE_REWRITE_MAX_TOKENS,
        temperature: STYLE_REWRITE_TEMPERATURE,
        top_p:       0.9,
      };
      const rewritten = await callOpenAI(rewritePayload);
      if (rewritten) text = rewritten;
    }

    // Limpiar saludos solemnes no pedidos
    if (text) {
      text = text
        .replace(/^(\s*["'""'']*\s*)?(querido|queridos)\s+(pueblo|compatriotas|argentinos|argentinas|amigos|hermanos)([^,.]{0,60})?[,\s]+/i, "")
        .replace(/^(\s*["'""'']*\s*)?(querido|queridos)\s+pueblo\s+argentino[,\s]+/i, "");
    }

    // Cortar si supera límite
    if (text && text.length > 1400) {
      const slice = text.slice(0, 1400);
      const last  = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
      text = last > 200 ? slice.slice(0, last + 1) : truncate(text, 1400);
    }

    if (text && webContext) text = linkifySources(text, webContext);
    return text;
  } catch (error) {
    throw new Error("Error al generar la respuesta desde GPT");
  }
}

module.exports = { getResponseFromGPT };
