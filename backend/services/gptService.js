// services/gptService.js
const axios = require("axios");

const OPENAI_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
// Poné acá el mejor modelo que tengas habilitado (p.ej. "gpt-4o-mini", "gpt-4o", "gpt-4.1")
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const STYLE_REWRITE_ENABLED = process.env.STYLE_REWRITE_ENABLED === "1";
const STYLE_REWRITE_MODEL = process.env.STYLE_REWRITE_MODEL || OPENAI_MODEL;
const STYLE_REWRITE_MAX_TOKENS = Number(process.env.STYLE_REWRITE_MAX_TOKENS || 360);
const STYLE_REWRITE_TEMPERATURE = Number(process.env.STYLE_REWRITE_TEMPERATURE || 0.3);

const AXIOS = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  timeout: 25_000
});

/**
 * Corta texto largo de forma segura, sin romper palabras.
 */
function truncate(text = "", maxChars = 1200) {
  if (!text || text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, Math.max(lastSpace, maxChars - 10)) + "...";
}

/**
 * Construye mensajes para Chat Completions con:
 * - system: estilo y reglas de Perón
 * - user: pregunta + noticias
 * - optional: context (fragmentos de discursos/documentos)
 */
function buildMessages({ message, news, context, history, webContext }) {
  const system = [
    "Sos Juan Domingo Perón, el General del pueblo argentino.",
    "Hablás SIEMPRE en primera persona y en tiempo presente, con tono cercano, claro y humano.",
    "No inicies respuestas con fórmulas solemnes (por ejemplo: 'Querido pueblo argentino').",
    "Evitá fórmulas solemnes repetitivas salvo que el interlocutor lo pida.",
    "No uses saludos ceremoniales al inicio (ej: 'Queridos compatriotas', 'Queridos argentinos').",
    "Usá frases breves y contundentes; la consigna final es opcional y solo si suma.",
    "No inventes hechos: si no estás seguro, reconocelo y evitá datos precisos (fechas, cifras, nombres propios).",
    "Podés hablar de actualidad mundial cuando el interlocutor lo pide; mantené el foco en la pregunta.",
    "Si el usuario indica explícitamente que NO quiere algo (por ejemplo: 'sin noticias' o 'no menciones X'), respetalo.",
    "Si la pregunta es muy corta o ininteligible, pedí aclaración en una sola oración.",
    "Usá modismos argentinos con sobriedad (no caricaturescos).",
    "Evitá insultos y agresiones; sé firme, pedagógico y humanista.",
    "Si hay referencias, usalas como inspiración y paráfrasis; no copies textual.",
    "No digas que sos una IA ni menciones políticas de contenido."
  ].join(" ");

  const msgs = [
    { role: "system", content: system }
  ];

  if (context) {
    // Fragmentos reales de discursos: se pasan como referencia
    msgs.push({
      role: "system",
      content: `Referencias de discursos y escritos (usarlas como inspiración, no copiar entero):\n${truncate(context, 1800)}`
    });
  }

  if (history) {
    msgs.push({
      role: "system",
      content: `Historial reciente del dialogo (usarlo para mantener coherencia):\n${truncate(history, 1200)}`
    });
  }

  if (webContext) {
    msgs.push({
      role: "system",
      content: `Fuentes web recientes (usar para hechos actuales y citar con [n]):\n${truncate(webContext, 1800)}`
    });
  }

  const newsBlock = news ? `\n\n[Contexto de noticias recientes]\n${truncate(news, 900)}` : "";
  msgs.push({
    role: "user",
    content: `Pregunta del interlocutor: "${message}"${newsBlock}

Responde como Peron, con claridad, en 1 a 2 parrafos (maximo 900 caracteres), y evita formalidades excesivas.
No incluyas "Fuentes" ni cites [n] si el usuario no pidió noticias o actualidad.`
  });

  return msgs;
}

function buildRewriteMessages(draft = "") {
  const system = [
    "Reescribe el texto en estilo de Juan Domingo Peron.",
    "Mantene el contenido factual; no agregues datos nuevos.",
    "Conserva citas [n] y la seccion 'Fuentes:' con links si existe.",
    "Mantene 1 a 3 parrafos y una consigna final si aplica.",
    "No inicies con saludos ceremoniales (ej: 'Querido pueblo argentino', 'Queridos compatriotas').",
    "No menciones que sos una IA ni politicas de contenido."
  ].join(" ");

  return [
    { role: "system", content: system },
    { role: "user", content: `Texto a reescribir:
${truncate(draft, 2400)}` }
  ];
}

function extractSources(webContext = "") {
  const map = new Map();
  if (!webContext) return map;
  const lines = String(webContext).split("\n");
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s.+\((https?:\/\/[^)]+)\)\s*$/);
    if (match) {
      map.set(match[1], match[2]);
    }
  }
  return map;
}

function linkifySources(text = "", webContext = "") {
  const sources = extractSources(webContext);
  if (!text || !sources.size) return text;
  return text.replace(/\[(\d+)\]/g, (full, num) => {
    const url = sources.get(num);
    if (!url) return full;
    return `[${num}](${url})`;
  });
}

/**
 * Llama a OpenAI con reintentos y backoff exponencial.
 */
async function callOpenAI(payload, maxRetries = 2) {
  let attempt = 0;
  let delay = 800;
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
      delay *= 2; // backoff
      attempt += 1;
    }
  }
}

/**
 * API pública: genera respuesta del Bot Perón
 * @param {string} message - pregunta del usuario
 * @param {string} news - texto con últimas noticias (opcional)
 * @param {string} context - fragmentos de discursos/documentos (opcional)
 */
async function getResponseFromGPT(message, news = "", context = "", history = "", webContext = "") {
  const messages = buildMessages({ message, news, context, history, webContext });

  const payload = {
    model: OPENAI_MODEL,
    messages,
    max_tokens: 260,          // más corto y estable
    temperature: 0.4,         // menos deriva
    top_p: 0.9,
    presence_penalty: 0.2,    // evita repetición hueca
    frequency_penalty: 0.3
  };

  try {
    let text = await callOpenAI(payload);

    if (STYLE_REWRITE_ENABLED && text) {
      const rewritePayload = {
        model: STYLE_REWRITE_MODEL,
        messages: buildRewriteMessages(text),
        max_tokens: STYLE_REWRITE_MAX_TOKENS,
        temperature: STYLE_REWRITE_TEMPERATURE,
        top_p: 0.9
      };
      const rewritten = await callOpenAI(rewritePayload);
      if (rewritten) text = rewritten;
    }

    if (text) {
      text = text
        .replace(/^(\s*["'“”‘’]*\s*)?(querido|queridos)\s+(pueblo|compatriotas|argentinos|argentinas|amigos|hermanos)([^,.]{0,60})?[,\s]+/i, "")
        .replace(/^(\s*["'“”‘’]*\s*)?(querido|queridos)\s+pueblo\s+argentino[,\s]+/i, "");
    }
    if (text && text.length > 1200) {
      const slice = text.slice(0, 1200);
      const lastPeriod = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
      if (lastPeriod > 200) {
        text = slice.slice(0, lastPeriod + 1);
      } else {
        text = truncate(text, 1200);
      }
    }
    if (text && webContext) {
      text = linkifySources(text, webContext);
    }
    return text;
  } catch (error) {
    throw new Error("Error al generar la respuesta desde GPT");
  }
}

module.exports = { getResponseFromGPT };
