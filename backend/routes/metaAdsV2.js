const router = require('express').Router();
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const {
  FRONTEND_URL,
  buildOAuthUrl,
  saveConnectionFromOAuth,
  listConnections,
  disconnectConnection,
  diagnoseMetaConnection,
  syncAdAccounts,
  listAdAccounts,
  selectAdAccount,
  updatePreference,
  enqueueSyncJob,
  listSyncJobs,
  processNextSyncJob,
  syncCampaigns,
  listOverview,
  getCampaignDetail,
  updateCampaignStatus,
  getAdSetDetail,
  getAdDetail,
  analyzeCampaign,
  analyzeAdSet,
  analyzeAd,
  createAgentAdRecommendation,
  createAndPublishAgentAd,
  applyRecommendation,
  rejectRecommendation,
  uploadMetaAdImage,
  uploadMetaAdVideo,
  createSimpleMetaAdCampaign,
  getMetaAdPreview,
  getMetaCreativePreview,
  createMetaCampaignFromDraft,
} = require('../services/metaAdsV2Service');

router.get('/oauth/url', auth, (req, res) => {
  try {
    res.json({ url: buildOAuthUrl(req.userId) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: metaError } = req.query;
    if (metaError) return res.redirect(`${FRONTEND_URL}/dashboard?meta_error=${encodeURIComponent(metaError)}`);
    if (!code || !state) return res.redirect(`${FRONTEND_URL}/dashboard?meta_error=missing_code`);

    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const connection = await saveConnectionFromOAuth(decoded.userId, code);
    const warning = connection.adAccountSync?.success === false
      ? `&meta_warning=${encodeURIComponent(connection.adAccountSync.error || 'ad_account_sync_failed')}`
      : '';
    res.redirect(`${FRONTEND_URL}/dashboard?meta_connected=true${warning}`);
  } catch (err) {
    console.error('Meta OAuth callback failed:', {
      message: err.message,
      statusCode: err.statusCode,
      metaError: err.metaError,
    });
    res.redirect(`${FRONTEND_URL}/dashboard?meta_error=${encodeURIComponent(err.message)}`);
  }
});

router.get('/overview', auth, async (req, res) => {
  try {
    res.json(await listOverview(req.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/connections', auth, async (req, res) => {
  try {
    res.json(await listConnections(req.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/diagnostics', auth, async (req, res) => {
  try {
    res.json(await diagnoseMetaConnection(req.userId, {
      connectionId: req.query.connectionId,
    }));
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Token diagnostics failed. Reconnect Meta and confirm the app requests ads_management, ads_read, business_management, pages_show_list, pages_read_engagement, and pages_manage_ads.'
        : undefined,
    });
  }
});

router.delete('/connections/:id', auth, async (req, res) => {
  try {
    const connection = await disconnectConnection(req.userId, req.params.id, req.body?.reason || 'user_disconnected');
    res.json({ success: true, connection });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/sync', auth, async (req, res) => {
  try {
    const result = await syncCampaigns(req.userId, {
      accountId: req.body.accountId,
      connectionId: req.body.connectionId,
      datePreset: req.body.datePreset || 'last_30d',
    });
    res.json({ success: true, ...result, overview: await listOverview(req.userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync/enqueue', auth, async (req, res) => {
  try {
    const job = await enqueueSyncJob(req.userId, {
      accountId: req.body.accountId,
      connectionId: req.body.connectionId,
      datePreset: req.body.datePreset || 'last_30d',
      jobType: req.body.jobType || 'manual',
      dateStart: req.body.dateStart,
      dateStop: req.body.dateStop,
    });
    res.status(202).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sync/process-next', auth, async (req, res) => {
  try {
    const result = await processNextSyncJob(req.body.workerId || `api-${req.userId}`, req.userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/sync/jobs', auth, async (req, res) => {
  try {
    const jobs = await listSyncJobs(req.userId, req.query.limit);
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ad-accounts/sync', auth, async (req, res) => {
  try {
    const adAccounts = await syncAdAccounts(req.userId);
    res.json({ success: true, adAccounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/ad-accounts', auth, async (req, res) => {
  try {
    res.json(await listAdAccounts(req.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/ad-accounts/select', auth, async (req, res) => {
  try {
    if (!req.body.accountId) return res.status(400).json({ error: 'accountId is required' });
    const adAccount = await selectAdAccount(req.userId, req.body.accountId, req.body.connectionId);
    res.json({ success: true, adAccount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/preferences', auth, async (req, res) => {
  try {
    const preference = await updatePreference(req.userId, req.body);
    res.json({ success: true, preference });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/campaigns/:campaignId', auth, async (req, res) => {
  try {
    res.json(await getCampaignDetail(req.userId, req.params.campaignId));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.put('/campaigns/:campaignId/status', auth, async (req, res) => {
  try {
    const result = await updateCampaignStatus(req.userId, req.params.campaignId, req.body.status);
    res.json({ success: true, campaign: result.campaign, actionLog: result.actionLog });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the status change. Check campaign delivery restrictions, account permissions, billing, and policy state.'
        : undefined,
    });
  }
});

router.post('/campaigns/:campaignId/analyze', auth, async (req, res) => {
  try {
    const result = await analyzeCampaign(req.userId, req.params.campaignId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:campaignId/agent-ad', auth, async (req, res) => {
  try {
    const recommendation = await createAgentAdRecommendation(req.userId, req.params.campaignId, req.body);
    res.status(201).json({ success: true, recommendation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/:campaignId/agent-ad/create-paused', auth, async (req, res) => {
  try {
    const result = await createAndPublishAgentAd(req.userId, req.params.campaignId, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the ad creation request. Check Page ID ownership, destination URL, selected ad set, creative policy, and ads_management permission.'
        : undefined,
    });
  }
});

router.get('/ads/:adId', auth, async (req, res) => {
  try {
    res.json(await getAdDetail(req.userId, req.params.adId));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.get('/ads/:adId/previews', auth, async (req, res) => {
  try {
    res.json(await getMetaAdPreview(req.userId, req.params.adId, req.query));
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the preview request. Confirm the ad belongs to the selected connected account.'
        : undefined,
    });
  }
});

router.get('/ad-creatives/:creativeId/previews', auth, async (req, res) => {
  try {
    res.json(await getMetaCreativePreview(req.userId, req.params.creativeId, req.query));
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the creative preview request. Confirm the creative belongs to the selected connected account.'
        : undefined,
    });
  }
});

router.get('/adsets/:adSetId', auth, async (req, res) => {
  try {
    res.json(await getAdSetDetail(req.userId, req.params.adSetId));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

router.post('/adsets/:adSetId/analyze', auth, async (req, res) => {
  try {
    const recommendations = await analyzeAdSet(req.userId, req.params.adSetId);
    res.json({ success: true, recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ads/:adId/analyze', auth, async (req, res) => {
  try {
    const recommendations = await analyzeAd(req.userId, req.params.adId);
    res.json({ success: true, recommendations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recommendations/:id/apply', auth, async (req, res) => {
  try {
    const result = await applyRecommendation(req.userId, req.params.id);
    res.json({ success: true, recommendation: result.recommendation, actionLog: result.actionLog });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the requested change. Check the Page ID, selected ad set, destination URL, and ad account permissions.'
        : undefined,
    });
  }
});

router.post('/recommendations/:id/reject', auth, async (req, res) => {
  try {
    res.json({ success: true, recommendation: await rejectRecommendation(req.userId, req.params.id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/campaigns/create', auth, async (req, res) => {
  try {
    const campaign = await createMetaCampaignFromDraft(req.userId, req.body);
    res.status(201).json({ success: true, campaign });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/ad-images/upload-url', auth, async (req, res) => {
  try {
    const image = await uploadMetaAdImage(req.userId, req.body);
    res.status(201).json({ success: true, image });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the image upload. Use a public image URL and confirm the selected ad account has ads_management permission.'
        : undefined,
    });
  }
});

router.post('/ad-videos/upload-url', auth, async (req, res) => {
  try {
    const video = await uploadMetaAdVideo(req.userId, req.body);
    res.status(201).json({ success: true, video });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the video upload. Use a public video URL and allow time for Meta video processing.'
        : undefined,
    });
  }
});

router.post('/campaigns/create-full', auth, async (req, res) => {
  try {
    const result = await createSimpleMetaAdCampaign(req.userId, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error('Meta create-full failed:', {
      message: err.message,
      statusCode: err.statusCode,
      metaError: err.metaError,
      bodySummary: {
        adType: req.body?.adType,
        objective: req.body?.objective,
        hasPageId: Boolean(req.body?.pageId),
        hasWebsiteUrl: Boolean(req.body?.websiteUrl),
        hasImageUrl: Boolean(req.body?.imageUrl),
        hasImageHash: Boolean(req.body?.imageHash),
        hasVideoUrl: Boolean(req.body?.videoUrl),
        hasVideoId: Boolean(req.body?.videoId),
        carouselCardCount: Array.isArray(req.body?.carouselCards) ? req.body.carouselCards.length : 0,
      },
    });
    res.status(err.statusCode || 500).json({
      error: err.message,
      metaError: err.metaError,
      hint: err.metaError
        ? 'Meta rejected the ad creation request. Check Page ID ownership, destination URL, image URL/hash, budget, billing, and ads_management permission.'
        : undefined,
    });
  }
});

module.exports = router;
