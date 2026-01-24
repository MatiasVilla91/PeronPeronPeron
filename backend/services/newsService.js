const axios = require("axios");

async function getLatestNews() {
    try {
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?sources=la-nacion,clarin,infobae&apiKey=${process.env.NEWS_API_KEY}`);
        
        const articles = response.data.articles
            .map(article => `${article.title} - ${article.description}`)
            .slice(0, 3); // Tomar solo los primeros 3 artículos

        if (articles.length === 0) {
            console.warn("No se encontraron noticias recientes.");
            return "";
        }

        return articles.join("\n");
    } catch (error) {
        console.error("Error al obtener noticias:", error.message);
        return "No pude obtener noticias actuales en este momento.";
    }
}

module.exports = { getLatestNews };
