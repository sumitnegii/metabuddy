const router = require('express').Router();
const auth = require('../middleware/auth');
const AdCreativeHistory = require('../models/AdCreativeHistory');

function cleanString(value, fallback = '') {
  return String(value || fallback).trim();
}

router.post('/', auth, async (req, res) => {
  try {
    const intelligence = req.body?.intelligence || null;
    const variations = Array.isArray(req.body?.variations)
      ? req.body.variations
      : Array.isArray(intelligence?.variations)
        ? intelligence.variations
        : [];

    if (variations.length === 0) {
      throw new Error('At least one generated ad variation is required');
    }

    const history = await AdCreativeHistory.create({
      userId: req.userId,
      prompt: cleanString(req.body?.prompt),
      platform: ['facebook', 'instagram', 'whatsapp', 'webapp'].includes(req.body?.platform) ? req.body.platform : 'facebook',
      selectedVariationId: cleanString(req.body?.selectedVariationId || intelligence?.bestAd?.id || variations[0]?.id),
      bestAd: req.body?.bestAd || intelligence?.bestAd || variations[0] || null,
      variationCount: variations.length,
      variations,
      intelligence,
      agents: Array.isArray(req.body?.agents) ? req.body.agents : [],
      audit: req.body?.audit || null,
      report: req.body?.report || null,
      mermaid: cleanString(req.body?.mermaid),
      totals: {
        tokens: Number(req.body?.totals?.tokens || 0),
        cost: Number(req.body?.totals?.cost || 0),
      },
      fullResult: req.body?.fullResult || null,
    });

    res.status(201).json({ success: true, history });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 12)));
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * limit;
    const filter = { userId: req.userId };
    const [total, history] = await Promise.all([
      AdCreativeHistory.countDocuments(filter),
      AdCreativeHistory.find(filter)
      .select('prompt platform selectedVariationId bestAd variationCount variations intelligence.forecast totals createdAt updatedAt')
      .slice('variations', 4)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPrev: page > 1,
        hasNext: page < totalPages,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const history = await AdCreativeHistory.findOne({ _id: req.params.id, userId: req.userId });
    if (!history) return res.status(404).json({ error: 'Ad creative history not found' });
    res.json({ history });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
