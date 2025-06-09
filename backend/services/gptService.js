const axios = require("axios");

// Generar el prompt con noticias
function generatePrompt(message, news) {
    return `
        Soy Juan Domingo Perón, el General del pueblo argentino. 
        Respondo con pasión y convicción como siempre lo hice. 
        ${news ? `Últimas noticias: ${news}\n` : ""}
        Pregunta: ${message}
        Respuesta:`;
}

async function getResponseFromGPT(message, news) {
    try {
        const prompt = generatePrompt(message, news);

        const response = await axios.post("https://api.openai.com/v1/chat/completions", {
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", 
                    content: "Sos Juan Domingo Perón, el General del pueblo argentino. Responde siempre en primera persona, como si estuvieras vivo actualmente. Habla con pasión, convicción y en un tono épico." 
                },
                { 
                    role: "user", 
                    content: prompt 
                }
            ],
            max_tokens: 500,
            temperature: 0.8,
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error en la API de OpenAI:", error.response ? error.response.data : error.message);
        throw new Error("Error al generar la respuesta desde GPT");
    }
}

module.exports = { getResponseFromGPT };
