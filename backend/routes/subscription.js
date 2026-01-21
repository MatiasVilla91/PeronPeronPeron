const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

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

const fetchSubscription = async (id) => {
  const { data } = await axios.get(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`
    }
  });
  return data;
};

const updateSubscription = async (id, status) => {
  const { data } = await axios.put(
    `https://api.mercadopago.com/preapproval/${id}`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return data;
};

router.get('/', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!mpAccessToken) {
    return res.status(500).json({ error: 'Missing MP access token' });
  }

  const supabaseAuthed = createAuthedClient(token);
  const { data: profile } = await supabaseAuthed
    .from('profiles')
    .select('mp_subscription_id, mp_status')
    .eq('id', user.id)
    .single();

  if (!profile?.mp_subscription_id) {
    return res.json({ hasSubscription: false });
  }

  try {
    const subscription = await fetchSubscription(profile.mp_subscription_id);
    res.json({
      hasSubscription: true,
      id: subscription.id,
      status: subscription.status,
      nextPaymentDate: subscription.next_payment_date || null
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo cargar la suscripcion' });
  }
});

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { action } = req.body;
  if (!['pause', 'cancel', 'resume'].includes(action)) {
    return res.status(400).json({ error: 'Accion invalida' });
  }

  if (!mpAccessToken) {
    return res.status(500).json({ error: 'Missing MP access token' });
  }

  const supabaseAuthed = createAuthedClient(token);
  const { data: profile } = await supabaseAuthed
    .from('profiles')
    .select('mp_subscription_id')
    .eq('id', user.id)
    .single();

  if (!profile?.mp_subscription_id) {
    return res.status(404).json({ error: 'No hay suscripcion activa' });
  }

  const statusMap = {
    pause: 'paused',
    cancel: 'cancelled',
    resume: 'authorized'
  };

  try {
    const updated = await updateSubscription(profile.mp_subscription_id, statusMap[action]);
    await supabaseAuthed.from('profiles').upsert({
      id: user.id,
      plan: updated.status === 'authorized' || updated.status === 'active' ? 'pro' : 'free',
      mp_status: updated.status
    });
    res.json({
      status: updated.status
    });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la suscripcion' });
  }
});

module.exports = router;
