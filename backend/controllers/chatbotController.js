// controllers/chatbotController.js
const { getResponseFromGPT } = require("../services/gptService");
const { getRelevantContext } = require("./trainController");
const { getLatestNews } = require("../services/newsService");
const { getWebContext } = require("../services/webSearchService");

async function getPeronResponse(message, history = "") {
  try {
    // 1) Traer fragmentos de discursos relacionados
    const context = await getRelevantContext(message);

    // 2) Noticias (opcionales)
    const noticias = await getLatestNews();

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
