const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dailyLimitAuth = Number(process.env.FREE_DAILY_LIMIT_AUTH || 5);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const isServiceRoleKey = (key = "") => {
  if (!key) return false;
  if (key.startsWith('sb_secret_')) return true;
  if (!key.startsWith('eyJ')) return false;
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString('utf8'));
    return payload?.role === 'service_role';
  } catch (error) {
    return false;
  }
};
const useServiceRoleKey = isServiceRoleKey(supabaseServiceKey) && supabaseServiceKey !== supabaseAnonKey;
const supabaseAdmin = useServiceRoleKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

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

router.get('/', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const user = await getAuthUser(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const supabaseAuthed = createAuthedClient(token);
  const today = new Date().toISOString().slice(0, 10);

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
  let plan = profile?.plan || 'free';
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

  res.json({
    id: user.id,
    email: user.email,
    plan,
    isPro: plan === 'pro',
    dailyLimit: plan === 'pro' ? null : dailyLimitAuth,
    dailyCount: usage?.count || 0,
    date: today
  });
});

module.exports = router;
