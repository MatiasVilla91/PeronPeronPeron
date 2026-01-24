const axios = require("axios");

async function getLatestNews() {
    try {
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?sources=la-nacion,clarin,infobae&apiKey=${process.env.NEWS_API_KEY}`);
        
        const isArgentina = (text = "") => {
            const lower = text.toLowerCase();
            return [
                "argentina",
                "argentino",
                "argentinos",
                "buenos aires",
                "casa rosada",
                "congreso",
                "milei",
                "rosario",
                "cordoba",
                "córdoba",
                "santa fe",
                "mendoza"
            ].some((token) => lower.includes(token));
        };

        const articles = response.data.articles
            .map(article => `${article.title} - ${article.description}`)
            .filter(text => isArgentina(text))
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
