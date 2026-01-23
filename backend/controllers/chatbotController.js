// controllers/chatbotController.js
const { getResponseFromGPT } = require("../services/gptService");
const { getRelevantContext } = require("./trainController");
const { getLatestNews } = require("../services/newsService");

async function getPeronResponse(message, history = "") {
  try {
    // 1) Traer fragmentos de discursos relacionados
    const context = await getRelevantContext(message);

    // 2) Noticias (opcionales)
    const noticias = await getLatestNews();

    // 3) Respuesta final (usa ambos)
    const gptResponse = await getResponseFromGPT(message, noticias, context, history);
    return gptResponse;
  } catch (error) {
    console.error("Error en el chatbot:", error.message);
    throw new Error("Error al generar la respuesta desde el bot");
  }
}

module.exports = { getPeronResponse };
