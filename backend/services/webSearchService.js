const axios = require("axios");

const BING_ENDPOINT = process.env.BING_SEARCH_ENDPOINT || "https://api.bing.microsoft.com/v7.0/search";
const BING_KEY = process.env.BING_SEARCH_KEY;
const BING_MARKET = process.env.BING_SEARCH_MARKET || "es-AR";
const WEB_CACHE_TTL_MS = Number(process.env.WEB_CACHE_TTL_MS || 10 * 60 * 1000);
const WEB_MAX_RESULTS = Number(process.env.WEB_MAX_RESULTS || 5);

const cache = new Map();

function shouldUseWebSearch(message = "") {
  const text = message.toLowerCase();
  const triggers = [
    "hoy",
    "actual",
    "ahora",
    "reciente",
    "ultimo",
    "último",
    "presidente",
    "gobierno",
    "ministro",
    "eleccion",
    "elección",
    "ley",
    "decreto",
    "dolar",
    "dólar",
    "inflacion",
    "inflación"
  ];
  return triggers.some((t) => text.includes(t));
}

function buildContext(results = []) {
  if (!results.length) return "";
  const lines = results.map((item, idx) => {
    const title = item.name || "Fuente";
    const snippet = item.snippet ? item.snippet.replace(/\s+/g, " ").trim() : "";
    const url = item.url || "";
    return `[${idx + 1}] ${title} - ${snippet} (${url})`;
  });
  return lines.join("\n");
}

async function getWebContext(message = "") {
  if (!message || !shouldUseWebSearch(message)) return "";
  if (!BING_KEY) {
    console.warn("Missing BING_SEARCH_KEY");
    return "";
  }

  const cacheKey = message.toLowerCase().slice(0, 200);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WEB_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const { data } = await axios.get(BING_ENDPOINT, {
      headers: {
        "Ocp-Apim-Subscription-Key": BING_KEY
      },
      params: {
        q: message,
        mkt: BING_MARKET,
        count: WEB_MAX_RESULTS,
        responseFilter: "Webpages",
        safeSearch: "Moderate",
        freshness: "Month",
        textDecorations: false,
        textFormat: "Raw"
      },
      timeout: 12_000
    });

    const results = data?.webPages?.value || [];
    const context = buildContext(results.slice(0, WEB_MAX_RESULTS));
    cache.set(cacheKey, { ts: Date.now(), value: context });
    return context;
  } catch (error) {
    console.error("Error al buscar en Bing:", error.response?.data || error.message);
    return "";
  }
}

module.exports = { getWebContext };
