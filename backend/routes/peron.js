const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { getPeronResponse } = require('../controllers/chatbotController');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const dailyLimit = Number(process.env.FREE_DAILY_LIMIT || 3);

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

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Texto requerido' });

  const supabaseAuthed = createAuthedClient(token);
  const today = new Date().toISOString().slice(0, 10);

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

  const plan = profile?.plan || 'free';

  const { data: usage } = await supabaseAuthed
    .from('usage_daily')
    .select('count')
    .eq('user_id', user.id)
    .eq('date', today)
    .single();

  const currentCount = usage?.count || 0;

  if (plan !== 'pro' && currentCount >= dailyLimit) {
    return res.status(429).json({ error: 'Daily limit reached' });
  }

  try {
    const respuestaTexto = await getPeronResponse(texto);

    await supabaseAuthed.from('usage_daily').upsert({
      user_id: user.id,
      date: today,
      count: currentCount + 1
    }, {
      onConflict: 'user_id,date'
    });

    res.json({ texto: respuestaTexto });
  } catch (error) {
    console.error('Error en /peron:', error.message);
    res.status(500).json({ error: 'Error al generar respuesta' });
  }
});

module.exports = router;
