// controllers/chatbotController.js
const { getResponseFromGPT } = require("../services/gptService");
const { getRelevantContext } = require("./trainController");
const { getLatestNews } = require("../services/newsService");
const { getWebContext } = require("../services/webSearchService");

const NEWS_KEYWORDS = [
  "noticia",
  "noticias",
  "actualidad",
  "titulares",
  "prensa",
  "diario",
  "diarios",
  "medios"
];

const isNegatedRequest = (text, keywords) => {
  const kw = keywords.join("|");
  const patterns = [
    `\\bno\\s+quiero\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+me\\s+des\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+me\\s+digas\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+menciones\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+uses\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+incluyas\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bsin\\s+(?:${kw})\\b`,
    `\\bevitar\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bevitá\\s+(?:\\w+\\s+){0,2}(?:${kw})\\b`,
    `\\bno\\s+(?:${kw})\\b`
  ];
  return patterns.some((p) => new RegExp(p, "i").test(text));
};

const shouldUseNews = (message = "") => {
  const text = message.toLowerCase();
  const wantsNews = NEWS_KEYWORDS.some((k) => text.includes(k));
  if (!wantsNews) return false;
  return !isNegatedRequest(text, NEWS_KEYWORDS);
};

async function getPeronResponse(message, history = "") {
  try {
    // 1) Traer fragmentos de discursos relacionados
    const context = await getRelevantContext(message);

    // 2) Noticias (opcionales)
    const noticias = shouldUseNews(message) ? await getLatestNews() : "";

    // 3) Contexto web (opcionales, con fuentes)
    const webContext = await getWebContext(message);

    // 4) Respuesta final (usa ambos)
    const gptResponse = await getResponseFromGPT(message, noticias, context, history, webContext);
    return gptResponse;
  } catch (error) {
    console.error("Error en el chatbot:", error.message);
    throw new Error("Error al generar la respuesta desde el bot");
  }
}

module.exports = { getPeronResponse };
