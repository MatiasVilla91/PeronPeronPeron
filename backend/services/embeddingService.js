const axios = require("axios");

const OPENAI_EMBEDDINGS_URL = process.env.OPENAI_EMBEDDINGS_URL || "https://api.openai.com/v1/embeddings";
const OPENAI_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

const AXIOS = axios.create({
  baseURL: OPENAI_EMBEDDINGS_URL,
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
  },
  timeout: 25_000
});

async function embedTexts(texts = []) {
  if (!texts.length) return [];
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const payload = {
    model: OPENAI_EMBEDDING_MODEL,
    input: texts
  };

  const { data } = await AXIOS.post("", payload);
  const vectors = Array.isArray(data?.data) ? data.data.map((item) => item.embedding) : [];
  return vectors;
}

module.exports = { embedTexts };
