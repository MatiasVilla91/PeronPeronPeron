// controllers/trainController.js
// RAG con Supabase pgvector — tabla peron_documents
const ws = require("ws");
const { createClient } = require("@supabase/supabase-js");
const { embedTexts }   = require("../services/embeddingService");

// ── Supabase ─────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[trainController] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { realtime: { transport: ws } })
  : null;

// ── Fallback: corpus local (peron_docs.json) ──────────────────
const fs   = require("fs");
const path = require("path");

let fallbackChunks = [];
let fallbackReady  = false;

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
];

function cleanLines(lines = []) {
  return lines
    .map(line => String(line).replace(/\s+/g, " ").trim())
    .filter(line => line.length > 0)
    .filter(line => !NOISE_PATTERNS.some(p => p.test(line)));
}

function chunkLines(lines, maxChars = 900, minChars = 240) {
  const out = [];
  let buffer = "";
  for (const line of lines) {
    const next = buffer ? `${buffer} ${line}` : line;
    if (next.length > maxChars && buffer.length >= minChars) {
      out.push(buffer);
      buffer = line;
    } else {
      buffer = next;
    }
  }
  if (buffer.trim().length >= 80) out.push(buffer.trim());
  return out;
}

function loadFallback() {
  if (fallbackReady) return;
  try {
    const filePath = path.join(__dirname, "..", "data", "peron_docs.json");
    const data     = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    for (const doc of data) {
      const lines   = Array.isArray(doc.texto) ? doc.texto : [doc.texto];
      const cleaned = cleanLines(lines);
      const pieces  = chunkLines(cleaned);
      for (const text of pieces) {
        fallbackChunks.push({
          content:  text,
          obra:     doc.tema   || "Perón",
          capitulo: doc.tipo   || "",
          fecha:    doc.fecha  || "",
        });
      }
    }
    fallbackReady = true;
    console.log(`[trainController] Fallback cargado: ${fallbackChunks.length} fragmentos`);
  } catch (e) {
    console.error("[trainController] Error cargando fallback:", e.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

function normalize(text = "") {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenize(text = "") {
  const STOP = new Set([
    "que","para","con","del","los","las","una","uno","por","como","pero","sus",
    "nos","ya","asi","ese","esa","esto","esta","toda","todo","hay","fue","ser",
    "son","era","han","al","el","la","y","o","de","a","en","un","se","lo","su",
    "si","no","mi","tu","es","me","te","le","les","the","and","or","of","in",
    "to","is","that","it","this","was","for","on","are","with","as","at"
  ]);
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter(t => t.length > 2 && !STOP.has(t));
}

function bm25Score(queryTokens, text) {
  const k1 = 1.2, b = 0.75, avgLen = 200;
  const tokens = tokenize(text);
  const freq   = new Map();
  for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
  let score = 0;
  for (const qt of queryTokens) {
    const tf = freq.get(qt) || 0;
    if (!tf) continue;
    const norm = tf + k1 * (1 - b + b * (tokens.length / avgLen));
    score += (tf * (k1 + 1)) / (norm || 1);
  }
  return score;
}

function mmrSelect(candidates, queryEmb, topK, lambda = 0.7) {
  const selected = [];
  const pool     = candidates.slice();
  while (selected.length < topK && pool.length) {
    let bestIdx = 0, bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const simQ = queryEmb && pool[i].embedding
        ? cosineSim(queryEmb, pool[i].embedding) : pool[i].bm25 || 0;
      let maxSel = 0;
      for (const s of selected) {
        const sim = pool[i].embedding && s.embedding
          ? cosineSim(pool[i].embedding, s.embedding) : 0;
        if (sim > maxSel) maxSel = sim;
      }
      const score = lambda * simQ - (1 - lambda) * maxSel;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    selected.push(...pool.splice(bestIdx, 1));
  }
  return selected;
}

function formatChunk(row) {
  const parts = [row.obra, row.volumen, row.capitulo, row.seccion, row.fecha]
    .filter(Boolean).join(" · ");
  return parts
    ? `[${parts}]\n${row.content}`
    : row.content;
}

// ── Función principal ─────────────────────────────────────────
async function getRelevantContext(message, options = {}) {
  const { topK = 5, candidateK = 30 } = options;
  if (!message) return "";

  // ── Intento 1: Supabase pgvector ──────────────────────────
  if (supabase) {
    try {
      const [queryEmbedding] = await embedTexts([message]);

      const { data, error } = await supabase.rpc("match_peron_documents", {
        query_embedding: queryEmbedding,
        match_count:     candidateK,
        min_similarity:  0.1,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("no results");

      // Reranking híbrido: 70% semántico + 30% BM25
      const queryTokens = tokenize(message);
      const scored = data.map(row => ({
        ...row,
        bm25:     bm25Score(queryTokens, row.content),
        semantic: row.similarity || 0,
      }));

      const maxBm25 = Math.max(...scored.map(r => r.bm25), 0.001);
      for (const r of scored) {
        r.combined = 0.7 * r.semantic + 0.3 * (r.bm25 / maxBm25);
      }
      scored.sort((a, b) => b.combined - a.combined);

      const selected = scored.slice(0, topK);
      return selected.map(formatChunk).join("\n\n");

    } catch (err) {
      console.warn("[trainController] pgvector falló, usando fallback:", err.message);
    }
  }

  // ── Fallback: corpus local ────────────────────────────────
  loadFallback();
  if (!fallbackChunks.length) return "";

  const queryTokens = tokenize(message);
  if (!queryTokens.length) return "";

  let queryEmb = null;
  try {
    const [v] = await embedTexts([message]);
    queryEmb = v;
  } catch (_) {}

  const scored = fallbackChunks
    .map(chunk => ({
      ...chunk,
      embedding: null,
      bm25: bm25Score(queryTokens, chunk.content),
    }))
    .filter(c => c.bm25 > 0)
    .sort((a, b) => b.bm25 - a.bm25)
    .slice(0, candidateK);

  if (!scored.length) return "";

  const selected = mmrSelect(scored, queryEmb, topK);
  return selected.map(c => {
    const meta = [c.obra, c.capitulo, c.fecha].filter(Boolean).join(" · ");
    return meta ? `[${meta}]\n${c.content}` : c.content;
  }).join("\n\n");
}

// Mantener compatibilidad con server.js
function loadDocuments() {
  loadFallback();
}

module.exports = { loadDocuments, getRelevantContext };
