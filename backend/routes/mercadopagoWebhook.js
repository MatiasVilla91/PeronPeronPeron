const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const fetchSubscription = async (id) => {
  const { data } = await axios.get(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: {
      Authorization: `Bearer ${mpAccessToken}`
    }
  });
  return data;
};

router.post('/', async (req, res) => {
  try {
    const topic = req.query.topic || req.body.type || req.body.topic;
    const id = req.body?.data?.id || req.query.id;

    if (!mpAccessToken) {
      return res.status(500).json({ error: 'Missing MP access token' });
    }

    if (!id) {
      return res.status(200).json({ received: true });
    }

    if (topic && !String(topic).includes('subscription')) {
      return res.status(200).json({ received: true });
    }

    const subscription = await fetchSubscription(id);
    const userId = subscription.external_reference;
    const status = subscription.status;
    const email = subscription.payer_email || null;

    if (!userId) {
      return res.status(200).json({ received: true });
    }

    const isActive = status === 'authorized' || status === 'active';

    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      plan: isActive ? 'pro' : 'free',
      mp_subscription_id: id,
      mp_status: status,
      mp_payer_email: email
    });

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error.response?.data || error.message);
    res.status(200).json({ received: true });
  }
});

module.exports = router;
