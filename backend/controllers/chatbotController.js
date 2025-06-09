const { getResponseFromGPT } = require("../services/gptService");
const { getResponseFromDocs } = require("./trainController");
const { getLatestNews } = require("../services/newsService");

async function getPeronResponse(message) {
    try {
        // Intentar obtener la respuesta desde los documentos cargados
        const docResponse = getResponseFromDocs(message);
        if (docResponse) {
            console.log("Respuesta desde documentos:", docResponse);
            return docResponse;
        }

        // Obtener noticias actuales
        const noticias = await getLatestNews();

        // Obtener la respuesta del bot
        const gptResponse = await getResponseFromGPT(message, noticias);
        console.log("Respuesta generada por GPT:", gptResponse);
        return gptResponse;

    } catch (error) {
        console.error("Error en el chatbot:", error.message);
        throw new Error("Error al generar la respuesta desde el bot");
    }
}

module.exports = { getPeronResponse };
