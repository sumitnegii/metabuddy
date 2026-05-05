const router = require('express').Router();
const auth = require('../middleware/auth');
const { predictAdPerformance } = require('../services/mcp/analyticsMcp');
const { storeAdMemory, getAdHistory, compareWithHistory } = require('../services/mcp/memoryMcp');
const { trackCost, getCostSummary } = require('../services/mcp/costTokenMcp');
const { getCompetitorIdeas } = require('../services/mcp/competitorMcp');

router.post('/analytics/predict', auth, async (req, res) => {
  try {
    res.json(predictAdPerformance(req.body || {}));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/memory/store', auth, async (req, res) => {
  try {
    const memory = await storeAdMemory(req.userId, req.body || {});
    res.json({ success: true, memory });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/memory/history', auth, async (req, res) => {
  try {
    const history = await getAdHistory(req.userId, {
      sector: req.query.sector,
      limit: req.query.limit,
    });
    res.json({ history });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/memory/compare', auth, async (req, res) => {
  try {
    res.json(await compareWithHistory(req.userId, req.body || {}));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cost/track', auth, async (req, res) => {
  try {
    const log = await trackCost(req.userId, req.body || {});
    res.json({ success: true, log });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/cost/summary', auth, async (req, res) => {
  try {
    res.json(await getCostSummary(req.userId, { agent: req.query.agent }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/competitor/ideas', auth, async (req, res) => {
  try {
    res.json(getCompetitorIdeas(req.body || {}));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
