const router = require('express').Router();
const auth = require('../middleware/auth');
const AdCreativePreview = require('../models/AdCreativePreview');
const { createSimpleMetaAdCampaign } = require('../services/metaAdsV2Service');

const allowedPlatforms = new Set(['facebook', 'instagram', 'whatsapp', 'webapp']);

function cleanString(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeCta(value) {
  const raw = cleanString(value, 'SHOP_NOW').toUpperCase().replace(/\s+/g, '_');
  const allowed = new Set(['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'BOOK_NOW', 'GET_QUOTE', 'APPLY_NOW', 'DOWNLOAD']);
  return allowed.has(raw) ? raw : 'SHOP_NOW';
}

function normalizeVariation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('variation is required');
  }

  const primaryText = cleanString(value.primaryText);
  const headline = cleanString(value.headline);
  if (!primaryText) throw new Error('variation.primaryText is required');
  if (!headline) throw new Error('variation.headline is required');

  return {
    ...value,
    id: cleanString(value.id),
    name: cleanString(value.name),
    bestFor: cleanString(value.bestFor),
    primaryText,
    headline,
    description: cleanString(value.description),
    cta: normalizeCta(value.cta),
    angle: cleanString(value.angle),
    keywordUsed: cleanString(value.keywordUsed),
  };
}

function validatePublishInput(input = {}) {
  const pageId = cleanString(input.pageId);
  const websiteUrl = cleanString(input.websiteUrl);
  const imageUrl = cleanString(input.imageUrl);
  const imageHash = cleanString(input.imageHash);

  if (!pageId) throw new Error('Facebook Page ID is required');
  if (!websiteUrl) throw new Error('Destination website URL is required');
  if (!imageUrl && !imageHash) throw new Error('Public image URL or Meta image hash is required');
  try {
    const parsed = new URL(websiteUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL');
  } catch {
    throw new Error('Destination website URL must be a valid http(s) URL');
  }
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid URL');
    } catch {
      throw new Error('Image URL must be a valid public http(s) URL');
    }
  }

  return {
    pageId,
    websiteUrl,
    imageUrl,
    imageHash,
    objective: cleanString(input.objective, 'OUTCOME_SALES'),
    country: cleanString(input.country, 'IN').toUpperCase().slice(0, 2) || 'IN',
    dailyBudget: Math.max(1, Number(input.dailyBudget || 500)),
  };
}

router.post('/', auth, async (req, res) => {
  try {
    const variation = normalizeVariation(req.body?.variation);
    const platform = allowedPlatforms.has(req.body?.platform) ? req.body.platform : 'facebook';
    const preview = await AdCreativePreview.create({
      userId: req.userId,
      variationId: variation.id,
      prompt: cleanString(req.body?.prompt),
      platform,
      rank: Math.max(1, Number(req.body?.rank || variation.rank || 1)),
      currency: cleanString(req.body?.currency, 'INR'),
      cpm: Number(req.body?.cpm || 100),
      variation,
      forecast: req.body?.forecast || null,
    });
    res.status(201).json({ success: true, preview });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/bulk', auth, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
    if (items.length === 0) throw new Error('items are required');

    const docs = items.map((item) => {
      const variation = normalizeVariation(item?.variation);
      const platform = allowedPlatforms.has(item?.platform) ? item.platform : 'facebook';
      return {
        userId: req.userId,
        variationId: variation.id,
        prompt: cleanString(item?.prompt),
        platform,
        rank: Math.max(1, Number(item?.rank || variation.rank || 1)),
        currency: cleanString(item?.currency, 'INR'),
        cpm: Number(item?.cpm || 100),
        variation,
        forecast: item?.forecast || null,
      };
    });

    const previews = await AdCreativePreview.insertMany(docs, { ordered: false });
    res.status(201).json({ success: true, previews });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));
    const previews = await AdCreativePreview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ previews });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const preview = await AdCreativePreview.findOne({ _id: req.params.id, userId: req.userId });
    if (!preview) return res.status(404).json({ error: 'Ad creative preview not found' });
    res.json({ preview });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/publish-meta', auth, async (req, res) => {
  let preview;
  try {
    preview = await AdCreativePreview.findOne({ _id: req.params.id, userId: req.userId });
    if (!preview) return res.status(404).json({ error: 'Ad creative preview not found' });

    const launchConfig = validatePublishInput(req.body || {});
    const variation = normalizeVariation(preview.variation);
    preview.status = 'publishing';
    preview.launchConfig = {
      ...preview.launchConfig,
      ...launchConfig,
    };
    preview.failureReason = '';
    await preview.save();

    const result = await createSimpleMetaAdCampaign(req.userId, {
      adType: 'IMAGE',
      campaignName: `MetaBuddy - ${variation.headline}`.slice(0, 100),
      adSetName: `MetaBuddy - ${variation.headline} - Ad Set`.slice(0, 100),
      adName: `MetaBuddy - ${variation.headline} - Ad`.slice(0, 100),
      creativeName: `MetaBuddy - ${variation.headline} - Creative`.slice(0, 100),
      objective: launchConfig.objective,
      dailyBudget: launchConfig.dailyBudget,
      country: launchConfig.country,
      pageId: launchConfig.pageId,
      imageUrl: launchConfig.imageUrl,
      imageHash: launchConfig.imageHash,
      primaryText: variation.primaryText,
      headline: variation.headline,
      description: variation.description,
      callToActionType: variation.cta,
      websiteUrl: launchConfig.websiteUrl,
    });

    preview.status = 'published_paused';
    preview.meta = {
      campaignId: result.campaignId || '',
      adSetId: result.adSetId || '',
      creativeId: result.creativeId || '',
      adId: result.adId || '',
      status: result.status || 'PAUSED',
      publishedAt: new Date(),
      raw: result,
    };
    await preview.save();

    res.status(201).json({ success: true, preview, ...result });
  } catch (err) {
    if (preview) {
      preview.status = 'failed';
      preview.failureReason = err.message;
      await preview.save().catch(() => {});
    }
    res.status(err.statusCode || 400).json({
      error: err.message,
      metaError: err.metaError,
      metaPreflight: err.metaPreflight,
      hint: err.metaError
        ? 'Meta rejected the ad creation request. Check Page ownership, selected ad account, destination URL, image URL/hash, billing, and ads_management permission.'
        : undefined,
    });
  }
});

module.exports = router;
