const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { getPeronResponse } = require('../controllers/chatbotController');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const dailyLimit = Number(process.env.FREE_DAILY_LIMIT || 3);
const maxInputChars = Number(process.env.MAX_INPUT_CHARS || 800);
const anonUsage = new Map();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    const { data: profile } = await supabaseAuthed
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      await supabaseAuthed.from('profiles').upsert({
        id: user.id,
        plan: 'free'
      });
    }

    plan = profile?.plan || 'free';

    const { data: usage } = await supabaseAuthed
      .from('usage_daily')
      .select('count')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    currentCount = usage?.count || 0;
  } else {
    const key = `${clientIp}:${today}`;
    currentCount = anonUsage.get(key) || 0;
    if (currentCount >= dailyLimit) {
      return res.status(429).json({ error: 'Daily limit reached' });
    }
  }

  if (plan !== 'pro' && currentCount >= dailyLimit) {
    return res.status(429).json({ error: 'Daily limit reached' });
  }

  try {
    const respuestaTexto = await getPeronResponse(texto);

    if (token && supabaseAuthed && user) {
      await supabaseAuthed.from('usage_daily').upsert({
        user_id: user.id,
        date: today,
        count: currentCount + 1
      }, {
        onConflict: 'user_id,date'
      });
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
