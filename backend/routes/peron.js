const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { getPeronResponse } = require('../controllers/chatbotController');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dailyLimitAnon = Number(process.env.FREE_DAILY_LIMIT_ANON || 3);
const dailyLimitAuth = Number(process.env.FREE_DAILY_LIMIT_AUTH || 5);
const maxInputChars = Number(process.env.MAX_INPUT_CHARS || 800);
const historyLimit = Number(process.env.HISTORY_LIMIT || 8);
const maxHistoryChars = Number(process.env.MAX_HISTORY_CHARS || 1600);
const anonUsage = new Map();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const getAuthUser = async (token) => {
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user;
};

const createAuthedClient = (token) => createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
});

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.ip || 'unknown';
};

const truncate = (text = "", maxChars = 1600) => {
  if (!text || text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, Math.max(lastSpace, maxChars - 10)) + "...";
};

const formatHistory = (items = []) => {
  if (!items.length) return "";
  const lines = items.map((item) => {
    const text = String(item.text || "").replace(/\s+/g, " ").trim();
    return `Usuario: ${text}`;
  });
  return truncate(lines.join("\n"), maxHistoryChars);
};

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto requerido' });
  if (texto.length > maxInputChars) {
    return res.status(413).json({ error: 'Texto demasiado largo' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const clientIp = getClientIp(req);

  let plan = 'free';
  let currentCount = 0;
  let supabaseAuthed = null;
  let user = null;

  if (token) {
    user = await getAuthUser(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    supabaseAuthed = createAuthedClient(token);

    const profileClient = supabaseAdmin || supabaseAuthed;
    const { data: profile } = await profileClient
      .from('profiles')
      .select('plan, mp_status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      await profileClient.from('profiles').upsert({
        id: user.id,
        plan: 'free'
      });
    }

    const isActiveSub = ['authorized', 'active'].includes(profile?.mp_status);
    plan = profile?.plan || 'free';
    if (isActiveSub && plan !== 'pro') {
      plan = 'pro';
      await profileClient.from('profiles').upsert({
        id: user.id,
        plan: 'pro'
      });
    }

    const usageClient = supabaseAdmin || supabaseAuthed;
    const { data: usage } = await usageClient
      .from('usage_daily')
      .select('count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    currentCount = usage?.count || 0;
  } else {
    const key = `${clientIp}:${today}`;
    currentCount = anonUsage.get(key) || 0;
    if (currentCount >= dailyLimitAnon) {
      return res.status(429).json({ error: 'Daily limit reached' });
    }
  }

  if (plan !== 'pro') {
    const limit = token ? dailyLimitAuth : dailyLimitAnon;
    if (currentCount >= limit) {
      return res.status(429).json({ error: 'Daily limit reached' });
    }
  }

  try {
    let historyText = "";
    if (token && supabaseAuthed && user) {
      const { data: historyItems } = await supabaseAuthed
        .from('chat_history')
        .select('role, text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(historyLimit);

      if (historyItems && historyItems.length) {
        const userOnly = historyItems
          .filter((item) => item.role === 'user')
          .slice(0, historyLimit)
          .slice()
          .reverse();
        if (userOnly.length) {
          historyText = formatHistory(userOnly);
        }
      }
    }

    const respuestaTexto = await getPeronResponse(texto, historyText);

    if (token && supabaseAuthed && user) {
      const writer = supabaseAdmin || supabaseAuthed;
      const { error: usageError } = await writer.from('usage_daily').upsert({
        user_id: user.id,
        date: today,
        count: currentCount + 1
      }, {
        onConflict: 'user_id,date'
      });
      if (usageError) {
        console.error('Error guardando uso diario:', usageError.message);
      }

      const { error: historyError } = await writer.from('chat_history').insert([
        { user_id: user.id, role: 'user', text: texto },
        { user_id: user.id, role: 'peron', text: respuestaTexto }
      ]);
      if (historyError) {
        console.error('Error guardando historial:', historyError.message);
      }
    } else {
      const key = `${clientIp}:${today}`;
      anonUsage.set(key, currentCount + 1);
    }

    res.json({ texto: respuestaTexto });
  } catch (error) {
    console.error('Error en /peron:', error.message);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
});

module.exports = router;
