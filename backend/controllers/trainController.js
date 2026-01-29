const fs = require("fs");
const path = require("path");
const { embedTexts } = require("../services/embeddingService");

let peronData = [];
let chunks = [];
let idf = new Map();
let avgDocLen = 0;
const chunkEmbeddings = new Map();
let embeddingsDirty = false;
let embeddingsMeta = {
    version: 1,
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    fingerprint: null
};

const EMBEDDINGS_PATH = path.join(__dirname, "..", "data", "peron_embeddings.json");

const NOISE_PATTERNS = [
    /www\.jdperon\.gov\.ar/i,
    /austria 2593/i,
    /1425 buenos aires/i,
    /instituto nacional .*per[oó]n/i,
    /tlfs\./i,
    /^\d+$/i,
    /^\d+\.$/i,
    /^[a-z]\.$/i,
    /^[ivxlcdm]+\.$/i,
    /^art\.$/i,
    /^registro n\.?$/i,
    /^documento n\.?$/i,
    /^cit\.$/i,
    /^cit\.,?\s*p(p)?\.$/i
];

const STOPWORDS = new Set([
    "que","para","con","del","los","las","una","uno","por","como","pero","sus","nos","ya","asi","ese","esa","esto",
    "esta","estos","estas","toda","todo","todas","todos","muy","mas","menos","hay","fue","ser","son","era","han",
    "al","el","la","y","o","de","a","en","un","se","lo","su","si","no","mi","tu","es","me","te","le","les","ya"
]);

function normalize(text = "") {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(text = "") {
    return normalize(text)
        .split(/[^a-z0-9]+/g)
        .filter(token => token.length > 2 && !STOPWORDS.has(token));
}

function cleanLines(lines = []) {
    return lines
        .map(line => String(line).replace(/\s+/g, " ").trim())
        .filter(line => line.length > 0)
        .filter(line => !NOISE_PATTERNS.some((pattern) => pattern.test(line)));
}

function chunkLines(lines, maxChars = 900, minChars = 240) {
    const out = [];
    let buffer = "";

    for (const line of lines) {
        const next = buffer ? `${buffer} ${line}` : line;
        if (next.length > maxChars && buffer.length >= minChars) {
            out.push(buffer);
            buffer = line;
            continue;
        }
        buffer = next;
    }

    if (buffer.trim().length >= 80) {
        out.push(buffer.trim());
    }

    return out;
}

function buildIndex() {
    const df = new Map();
    let totalLen = 0;

    for (const chunk of chunks) {
        const tokens = tokenize(chunk.text);
        const termFreq = new Map();
        const unique = new Set();

        for (const token of tokens) {
            termFreq.set(token, (termFreq.get(token) || 0) + 1);
            unique.add(token);
        }

        for (const token of unique) {
            df.set(token, (df.get(token) || 0) + 1);
        }

        chunk.tokens = tokens;
        chunk.termFreq = termFreq;
        chunk.len = tokens.length || 1;
        totalLen += chunk.len;
    }

    avgDocLen = chunks.length ? totalLen / chunks.length : 0;
    idf = new Map();
    const totalDocs = chunks.length || 1;

    for (const [token, freq] of df.entries()) {
        const value = Math.log((totalDocs - freq + 0.5) / (freq + 0.5) + 1);
        idf.set(token, value);
    }
}

function getDocumentsFingerprint(filePath) {
    try {
        const stat = fs.statSync(filePath);
        return `${stat.size}-${Math.floor(stat.mtimeMs)}`;
    } catch (error) {
        return null;
    }
}

function loadEmbeddingsCache(fingerprint) {
    try {
        if (!fs.existsSync(EMBEDDINGS_PATH)) return;
        const raw = fs.readFileSync(EMBEDDINGS_PATH, "utf-8");
        const parsed = JSON.parse(raw || "{}");

        if (!parsed || parsed.version !== 1) return;
        if (parsed.model && parsed.model !== embeddingsMeta.model) return;
        if (parsed.fingerprint && parsed.fingerprint !== fingerprint) return;

        const items = parsed.items || {};
        for (const [id, vector] of Object.entries(items)) {
            if (Array.isArray(vector) && vector.length) {
                chunkEmbeddings.set(Number(id), vector);
            }
        }
    } catch (error) {
        console.warn("No se pudo cargar el cache de embeddings:", error.message);
    }
}

function saveEmbeddingsCache() {
    if (!embeddingsDirty) return;
    try {
        const items = {};
        for (const [id, vector] of chunkEmbeddings.entries()) {
            items[id] = vector;
        }

        const payload = {
            version: embeddingsMeta.version,
            model: embeddingsMeta.model,
            fingerprint: embeddingsMeta.fingerprint,
            items
        };

        const tmpPath = `${EMBEDDINGS_PATH}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(payload));
        fs.renameSync(tmpPath, EMBEDDINGS_PATH);
        embeddingsDirty = false;
    } catch (error) {
        console.warn("No se pudo guardar el cache de embeddings:", error.message);
    }
}

function loadDocuments() {
    try {
        const filePath = path.join(__dirname, "..", "data", "peron_docs.json");
        const data = fs.readFileSync(filePath, "utf-8");
        peronData = JSON.parse(data);

        chunks = [];
        let chunkId = 0;

        for (const doc of peronData) {
            const lines = Array.isArray(doc.texto) ? doc.texto : [doc.texto];
            const cleaned = cleanLines(lines);
            const pieces = chunkLines(cleaned);

            for (const text of pieces) {
                chunks.push({
                    id: chunkId++,
                    text,
                    tema: doc.tema || "General",
                    fecha: doc.fecha || "Desconocida",
                    tipo: doc.tipo || "discurso",
                    autor: doc.autor || "Juan Domingo Perón"
                });
            }
        }

        const fingerprint = getDocumentsFingerprint(filePath);
        embeddingsMeta.fingerprint = fingerprint;
        loadEmbeddingsCache(fingerprint);
        buildIndex();
        console.log(`Documentos cargados correctamente. Fragmentos: ${chunks.length}`);
    } catch (error) {
        console.error("Error al cargar documentos:", error.message);
    }
}

function lexicalScore(queryTokens, chunk) {
    let score = 0;
    const k1 = 1.2;
    const b = 0.75;

    for (const token of queryTokens) {
        const tf = chunk.termFreq.get(token);
        if (!tf) continue;
        const weight = idf.get(token) || 0;
        const norm = tf + k1 * (1 - b + b * (chunk.len / (avgDocLen || 1)));
        score += weight * ((tf * (k1 + 1)) / (norm || 1));
    }
    return score;
}

function cosineSimilarity(a = [], b = []) {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i += 1) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (!normA || !normB) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function formatContext(chunk) {
    const meta = [chunk.tipo, chunk.fecha, chunk.tema].filter(Boolean).join(" · ");
    const prefix = meta ? `[${meta}] ` : "";
    return `${prefix}${chunk.text}`;
}

function mmrSelect(candidates = [], queryEmbedding, topK, lambda = 0.75) {
    if (!queryEmbedding || !candidates.length) return [];
    const selected = [];
    const remaining = candidates.slice();

    while (selected.length < topK && remaining.length) {
        let bestIndex = 0;
        let bestScore = -Infinity;

        for (let i = 0; i < remaining.length; i += 1) {
            const candidate = remaining[i];
            const emb = candidate.embedding;
            const simToQuery = emb ? cosineSimilarity(queryEmbedding, emb) : 0;
            let maxSimToSelected = 0;

            for (const picked of selected) {
                const sim = emb && picked.embedding ? cosineSimilarity(emb, picked.embedding) : 0;
                if (sim > maxSimToSelected) maxSimToSelected = sim;
            }

            const score = lambda * simToQuery - (1 - lambda) * maxSimToSelected;
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }

        const [picked] = remaining.splice(bestIndex, 1);
        selected.push(picked);
    }

    return selected;
}

async function getRelevantContext(message, options = {}) {
    const { topK = 4, candidateK = 40 } = options;
    if (!message || !chunks.length) return "";

    const queryTokens = tokenize(message);
    if (!queryTokens.length) return "";

    const scored = chunks
        .map((chunk) => ({ chunk, score: lexicalScore(queryTokens, chunk) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, candidateK);

    if (!scored.length) return "";

    if (!process.env.OPENAI_API_KEY) {
        return scored.slice(0, topK).map(({ chunk }) => formatContext(chunk)).join("\n\n");
    }

    let queryEmbedding = null;
    try {
        const [vector] = await embedTexts([message]);
        queryEmbedding = vector;
    } catch (error) {
        return scored.slice(0, topK).map(({ chunk }) => formatContext(chunk)).join("\n\n");
    }

    if (!queryEmbedding) {
        return scored.slice(0, topK).map(({ chunk }) => formatContext(chunk)).join("\n\n");
    }

    const missing = scored
        .map(({ chunk }) => chunk)
        .filter((chunk) => !chunkEmbeddings.has(chunk.id));

    if (missing.length) {
        try {
            const vectors = await embedTexts(missing.map((chunk) => chunk.text));
            for (let i = 0; i < missing.length; i += 1) {
                if (vectors[i]) {
                    chunkEmbeddings.set(missing[i].id, vectors[i]);
                    embeddingsDirty = true;
                }
            }
            saveEmbeddingsCache();
        } catch (error) {
            return scored.slice(0, topK).map(({ chunk }) => formatContext(chunk)).join("\n\n");
        }
    }

    const candidates = scored.map(({ chunk, score }) => {
        const embedding = chunkEmbeddings.get(chunk.id);
        const semantic = embedding ? cosineSimilarity(queryEmbedding, embedding) : 0;
        return { chunk, embedding, semantic, lexical: score };
    });

    const selected = mmrSelect(candidates, queryEmbedding, topK, 0.75);
    const reranked = selected.length
        ? selected
        : candidates
            .sort((a, b) => {
                if (b.semantic === a.semantic) return b.lexical - a.lexical;
                return b.semantic - a.semantic;
            })
            .slice(0, topK);

    const output = reranked.map(({ chunk }) => formatContext(chunk));

    return output.join("\n\n");
}

module.exports = { loadDocuments, getRelevantContext };
