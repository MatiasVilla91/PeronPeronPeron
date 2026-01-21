const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
const mpWebhookSecret = process.env.MP_WEBHOOK_SECRET;
const mpWebhookToleranceMs = Number(process.env.MP_WEBHOOK_TOLERANCE_MS || 5 * 60 * 1000);

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const parseSignatureHeader = (value) => {
  if (!value) return { ts: null, v1: null };
  const parts = value.split(',');
  let ts = null;
  let v1 = null;
  parts.forEach((part) => {
    const [key, val] = part.split('=').map((item) => item.trim());
    if (key === 'ts') ts = val;
    if (key === 'v1') v1 = val;
  });
  return { ts, v1 };
};

const isValidSignature = (req) => {
  if (!mpWebhookSecret) return true;
  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  const dataId =
    req.query['data.id'] ||
    req.query.id ||
    req.body?.data?.id ||
    '';
  const { ts, v1 } = parseSignatureHeader(xSignature);

  if (!xRequestId || !ts || !v1 || !dataId) return false;
  const timestamp = Number(ts);
  if (Number.isNaN(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > mpWebhookToleranceMs) return false;

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac('sha256', mpWebhookSecret)
    .update(manifest)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(v1, 'utf8')
    );
  } catch (error) {
    return false;
  }
};

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

    if (!isValidSignature(req)) {
      return res.status(401).json({ error: 'Invalid signature' });
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
