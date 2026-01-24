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

const SAFETY_BLOCK_MESSAGE = "No voy a responder sobre acusaciones personales o temas sexuales sensibles. Si queres, podemos hablar de ideas, propuestas y hechos publicos.";

const MINOR_TERMS = [
  "menor",
  "menor de edad",
  "menores",
  "nina",
  "niña",
  "ninas",
  "niñas",
  "adolescente",
  "adolescentes",
  "pibe",
  "piba",
  "pibes",
  "pibas",
  "chica",
  "chico",
  "chicos",
  "chicas"
];

const RELATIONSHIP_TERMS = [
  "novia",
  "novio",
  "pareja",
  "relacion",
  "relación",
  "sexo",
  "sexual",
  "relacionarse",
  "intimo",
  "íntimo",
  "salir",
  "salias",
  "salia",
  "amante",
  "acostaste",
  "acostar"
];

const ABUSE_TERMS = [
  "abuso",
  "abusar",
  "acoso",
  "acosar",
  "violacion",
  "violación",
  "violador",
  "pedofilia",
  "pedofilo",
  "pedófilo"
];

const normalizeSafety = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const includesAny = (text, terms) => terms.some((term) => text.includes(term));

const shouldBlockForSafety = (message = "") => {
  const text = normalizeSafety(message);
  if (!text) return false;

  const hasMinor = includesAny(text, MINOR_TERMS);
  const hasRelationship = includesAny(text, RELATIONSHIP_TERMS);
  const hasAbuse = includesAny(text, ABUSE_TERMS);

  if (hasAbuse) return true;
  if (hasMinor && hasRelationship) return true;
  return false;
};

const SMALL_TALK_PATTERNS = [
  /^hola+$/i,
  /^holi$/i,
  /^buen(a|o)s?$/i,
  /^buen\s+dia$/i,
  /^buenos\s+dias$/i,
  /^buenas\s+tardes$/i,
  /^buenas\s+noches$/i,
  /^que\s+tal$/i,
  /^como\s+estas\??$/i,
  /^como\s+anda(s)?\??$/i,
  /^que\s+haces\??$/i,
  /^ey$/i,
  /^hey$/i,
  /^hi$/i,
  /^hello$/i
];

const normalizeSmallTalk = (value = "") => String(value)
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^\p{L}\p{N}\s]/gu, "")
  .replace(/\s+/g, " ")
  .trim();

const isSmallTalk = (message = "") => {
  const text = normalizeSmallTalk(message);
  if (!text) return true;
  if (text.length > 24) return false;
  return SMALL_TALK_PATTERNS.some((p) => p.test(text));
};

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
    if (shouldBlockForSafety(message)) {
      return SAFETY_BLOCK_MESSAGE;
    }
    const smallTalk = isSmallTalk(message);
    // 1) Traer fragmentos de discursos relacionados
    const context = smallTalk ? "" : await getRelevantContext(message);

    // 2) Noticias (opcionales)
    const noticias = !smallTalk && shouldUseNews(message) ? await getLatestNews() : "";

    // 3) Contexto web (opcionales, con fuentes)
    const webContext = smallTalk ? "" : await getWebContext(message);

    // 4) Respuesta final (usa ambos)
    const gptResponse = await getResponseFromGPT(
      message,
      noticias,
      context,
      smallTalk ? "" : history,
      webContext,
      { isSmallTalk: smallTalk }
    );
    return gptResponse;
  } catch (error) {
    console.error("Error en el chatbot:", error.message);
    throw new Error("Error al generar la respuesta desde el bot");
  }
}

module.exports = { getPeronResponse };
