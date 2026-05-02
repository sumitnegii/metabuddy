const router = require('express').Router();
const auth = require('../middleware/auth');
const MetaConnection = require('../models/MetaConnection');
const { validateToken, fetchCampaigns, fetchAccountInsights, fetchDailyBreakdown } = require('../services/metaService');
const jwt = require('jsonwebtoken');

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = `http://localhost:${process.env.PORT || 5001}`;

// ── OAuth: Generate login URL ──
router.get('/oauth/url', auth, (req, res) => {
  // Encode userId in the state param so we know who to associate the token with after callback
  const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const redirectUri = `${BACKEND_URL}/api/meta/oauth/callback`;
  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_show_list',
    'pages_read_engagement',
    'read_insights'
  ].join(',');

  const url = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?` +
    `client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${scopes}` +
    `&state=${state}` +
    `&response_type=code`;

  res.json({ url });
});

// ── OAuth: Callback (Facebook redirects here) ──
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: fbError } = req.query;

    if (fbError) {
      return res.redirect(`${FRONTEND_URL}/onboarding?meta_error=${encodeURIComponent(fbError)}`);
    }

    if (!code || !state) {
      return res.redirect(`${FRONTEND_URL}/onboarding?meta_error=missing_code`);
    }

    // Verify state to get userId
    let decoded;
    try {
      decoded = jwt.verify(state, process.env.JWT_SECRET);
    } catch (err) {
      return res.redirect(`${FRONTEND_URL}/onboarding?meta_error=invalid_state`);
    }

    const userId = decoded.userId;
    const redirectUri = `${BACKEND_URL}/api/meta/oauth/callback`;

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
      `client_id=${META_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${META_APP_SECRET}` +
      `&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.redirect(`${FRONTEND_URL}/onboarding?meta_error=${encodeURIComponent(tokenData.error.message)}`);
    }

    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longLivedUrl = `https://graph.facebook.com/${META_API_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longRes = await fetch(longLivedUrl);
    const longData = await longRes.json();
    const accessToken = longData.access_token || shortLivedToken;
    const expiresIn = longData.expires_in || 5184000; // default 60 days

    // Fetch user's ad accounts
    const accountsUrl = `https://graph.facebook.com/${META_API_VERSION}/me/adaccounts?` +
      `fields=id,name,account_status` +
      `&access_token=${accessToken}`;

    const accountsRes = await fetch(accountsUrl);
    const accountsData = await accountsRes.json();

    let adAccountId = process.env.META_AD_ACCOUNT_ID;
    let adAccountName = '';

    if (accountsData.data && accountsData.data.length > 0) {
      // Use the first active ad account
      const activeAccount = accountsData.data.find(a => a.account_status === 1) || accountsData.data[0];
      adAccountId = activeAccount.id;
      adAccountName = activeAccount.name || '';
    }

    // Store connection
    await MetaConnection.findOneAndUpdate(
      { userId },
      {
        accessToken,
        adAccountId,
        adAccountName,
        isValid: true,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        lastVerifiedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Redirect back to frontend with success
    res.redirect(`${FRONTEND_URL}/onboarding?meta_connected=true`);
  } catch (err) {
    console.error('Meta OAuth callback error:', err);
    res.redirect(`${FRONTEND_URL}/onboarding?meta_error=${encodeURIComponent(err.message)}`);
  }
});

// ── Save / update Meta connection (manual fallback) ──
router.post('/connect', auth, async (req, res) => {
  try {
    const { accessToken, adAccountId, adAccountName } = req.body;
    if (!accessToken || !adAccountId) {
      return res.status(400).json({ error: 'accessToken and adAccountId are required' });
    }

    try {
      await validateToken(accessToken);
    } catch (err) {
      return res.status(400).json({ error: `Invalid Meta token: ${err.message}` });
    }

    const connection = await MetaConnection.findOneAndUpdate(
      { userId: req.userId },
      {
        accessToken,
        adAccountId,
        adAccountName: adAccountName || '',
        isValid: true,
        lastVerifiedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, connection: { adAccountId: connection.adAccountId, adAccountName: connection.adAccountName, isValid: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Check Meta connection status ──
router.get('/status', auth, async (req, res) => {
  try {
    const connection = await MetaConnection.findOne({ userId: req.userId });
    if (!connection) return res.json({ connected: false });

    res.json({
      connected: true,
      isValid: connection.isValid,
      adAccountId: connection.adAccountId,
      adAccountName: connection.adAccountName,
      lastVerifiedAt: connection.lastVerifiedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Disconnect Meta ──
router.delete('/disconnect', auth, async (req, res) => {
  try {
    await MetaConnection.findOneAndDelete({ userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fetch live campaigns from Meta ──
router.get('/campaigns', auth, async (req, res) => {
  try {
    const connection = await MetaConnection.findOne({ userId: req.userId, isValid: true });
    if (!connection) return res.status(400).json({ error: 'No valid Meta connection' });

    const campaigns = await fetchCampaigns(connection.accessToken, connection.adAccountId);
    res.json({ campaigns, total: campaigns.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fetch account-level insights ──
router.get('/insights', auth, async (req, res) => {
  try {
    const connection = await MetaConnection.findOne({ userId: req.userId, isValid: true });
    if (!connection) return res.status(400).json({ error: 'No valid Meta connection' });

    const datePreset = req.query.datePreset || 'last_30d';
    const insights = await fetchAccountInsights(connection.accessToken, connection.adAccountId, datePreset);
    res.json(insights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Fetch daily breakdown ──
router.get('/daily', auth, async (req, res) => {
  try {
    const connection = await MetaConnection.findOne({ userId: req.userId, isValid: true });
    if (!connection) return res.status(400).json({ error: 'No valid Meta connection' });

    const datePreset = req.query.datePreset || 'last_30d';
    const breakdown = await fetchDailyBreakdown(connection.accessToken, connection.adAccountId, datePreset);
    res.json({ daily: breakdown });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { launchCampaignToMeta } = require('../services/AutomatedLoopService');

// ── Launch a campaign to Meta (🔥 Automated) ──
router.post('/launch', auth, async (req, res) => {
  try {
    const { campaignId, pageId } = req.body;
    if (!campaignId || !pageId) {
      return res.status(400).json({ error: 'campaignId and pageId are required' });
    }

    const result = await launchCampaignToMeta(campaignId, req.userId, pageId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
