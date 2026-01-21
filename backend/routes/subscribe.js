const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
const mpBackUrl = process.env.MP_BACK_URL || 'https://peronperon.netlify.app/#chat';
const mpReason = process.env.MP_PRO_REASON || 'Plan Pro Proyecto PERON';
const mpCurrency = process.env.MP_CURRENCY || 'ARS';
const mpAmount = Number(process.env.MP_PRO_AMOUNT || 7500);

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

  if (!mpAccessToken) {
    console.error('Missing MP access token');
    return res.status(500).json({ error: 'Missing MP access token' });
  }

  try {
    const payload = {
      reason: mpReason,
      external_reference: user.id,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: mpAmount,
        currency_id: mpCurrency
      },
      back_url: mpBackUrl
    };

    const { data } = await axios.post('https://api.mercadopago.com/preapproval', payload, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const supabaseAuthed = createAuthedClient(token);
    await supabaseAuthed.from('profiles').upsert({
      id: user.id,
      plan: 'free',
      mp_subscription_id: data.id || null,
      mp_status: data.status || null,
      mp_payer_email: user.email || null
    });

    res.json({
      init_point: data.init_point,
      subscription_id: data.id,
      status: data.status
    });
  } catch (error) {
    const mpError = error.response?.data || null;
    console.error('Error creando suscripcion:', mpError || error.message);
    res.status(500).json({
      error: 'No se pudo crear la suscripcion',
      details: mpError?.message || mpError?.error || error.message
    });
  }
});

module.exports = router;
