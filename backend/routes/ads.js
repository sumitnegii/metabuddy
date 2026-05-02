const router = require('express').Router();
const auth = require('../middleware/auth');
const Ad = require('../models/Ad');
const Performance = require('../models/Performance');
const Campaign = require('../models/Campaign');
const MetaConnection = require('../models/MetaConnection');
const { fetchSingleCampaignInsights } = require('../services/metaService');

// ── Mark ad copy as posted ──
router.post('/', auth, async (req, res) => {
  try {
    const { campaignId, generatedCopyId, platform, platformAdId, adCopy, headline, hook, cta } = req.body;
    if (!campaignId || !generatedCopyId) return res.status(400).json({ error: 'campaignId and generatedCopyId required' });

    const ad = await Ad.create({
      campaignId, userId: req.userId, generatedCopyId,
      platform: platform || 'meta',
      platformAdId: platformAdId || '',
      adCopy, headline, hook, cta,
      status: platformAdId ? 'live' : 'draft',
      postedAt: platformAdId ? new Date() : undefined,
    });

    // Update campaign status
    await Campaign.findByIdAndUpdate(campaignId, { status: 'posted' });

    res.status(201).json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update ad with platform ID (when user posts it) ──
router.put('/:id/link', auth, async (req, res) => {
  try {
    const { platformAdId } = req.body;
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { platformAdId, status: 'live', postedAt: new Date() },
      { new: true }
    );
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    await Campaign.findByIdAndUpdate(ad.campaignId, { status: 'tracking' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Update ad details ──
router.put('/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      req.body,
      { new: true }
    );
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    res.json(ad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sync performance from Meta API ──
router.post('/:id/sync', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.userId });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });
    if (!ad.platformAdId) return res.status(400).json({ error: 'No platform ad ID linked' });

    const conn = await MetaConnection.findOne({ userId: req.userId, isValid: true });
    if (!conn) return res.status(400).json({ error: 'No Meta connection. Connect in Settings.' });

    const metrics = await fetchSingleCampaignInsights(conn.accessToken, ad.platformAdId);

    const perf = await Performance.create({
      adId: ad._id, campaignId: ad.campaignId, userId: req.userId,
      ...metrics, fetchedAt: new Date(),
    });

    res.json(perf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manually enter performance (for testing) ──
router.post('/:id/manual-perf', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, userId: req.userId });
    if (!ad) return res.status(404).json({ error: 'Ad not found' });

    const perf = await Performance.create({
      adId: ad._id, campaignId: ad.campaignId, userId: req.userId,
      ...req.body, fetchedAt: new Date(),
    });

    res.json(perf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Direct Posting Simulation (Publish to Meta/LinkedIn) ──
router.post('/publish', auth, async (req, res) => {
  try {
    const { campaignId, generatedCopyId, platform, adCopy, headline, hook, cta } = req.body;
    if (!campaignId || !generatedCopyId) return res.status(400).json({ error: 'campaignId and generatedCopyId required' });

    // 1. Create or update the ad record as "live"
    const ad = await Ad.findOneAndUpdate(
      { campaignId, generatedCopyId, userId: req.userId },
      { 
        platform: platform || 'meta',
        platformAdId: `sim_${platform || 'meta'}_${Date.now()}`,
        adCopy, headline, hook, cta,
        status: 'live',
        postedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // 2. Update campaign status to "tracking"
    await Campaign.findByIdAndUpdate(campaignId, { status: 'tracking' });

    // 3. Initialize seed performance data for the dashboard
    await Performance.create({
      adId: ad._id,
      campaignId,
      userId: req.userId,
      fetchedAt: new Date(),
      impressions: Math.floor(Math.random() * 500) + 100,
      reach: Math.floor(Math.random() * 400) + 50,
      clicks: Math.floor(Math.random() * 20) + 5,
      ctr: (Math.random() * 2 + 1).toFixed(2),
      spend: (Math.random() * 10 + 5).toFixed(2),
      leads: Math.floor(Math.random() * 2),
      cpl: 0
    });

    res.status(200).json({ success: true, ad });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get all ads for a campaign ──
router.get('/campaign/:campaignId', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ campaignId: req.params.campaignId, userId: req.userId });
    const adsWithPerf = await Promise.all(ads.map(async (ad) => {
      const perf = await Performance.findOne({ adId: ad._id }).sort({ fetchedAt: -1 });
      return { ...ad.toObject(), latestPerformance: perf };
    }));
    res.json(adsWithPerf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
