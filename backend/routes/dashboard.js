const router = require('express').Router();
const auth = require('../middleware/auth');
const Campaign = require('../models/Campaign');
const Ad = require('../models/Ad');
const Performance = require('../models/Performance');

// ── Dashboard stats ──
router.get('/stats', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const [totalCampaigns, totalAds, performances] = await Promise.all([
      Campaign.countDocuments({ userId }),
      Ad.countDocuments({ userId }),
      Performance.find({ userId }),
    ]);

    const totalSpend = performances.reduce((s, p) => s + (p.spend || 0), 0);
    const totalLeads = performances.reduce((s, p) => s + (p.leads || 0), 0);
    const totalClicks = performances.reduce((s, p) => s + (p.clicks || 0), 0);
    const totalImpressions = performances.reduce((s, p) => s + (p.impressions || 0), 0);
    const totalReach = performances.reduce((s, p) => s + (p.reach || 0), 0);

    res.json({ 
      totalActivePosts: totalAds,
      totalActiveMembers: totalLeads,
      totalImpressions: { 
        total: totalImpressions, 
        paid: Math.floor(totalImpressions * 0.15), 
        organic: Math.floor(totalImpressions * 0.85) 
      },
      totalEngagements: { 
        total: totalClicks, 
        paid: 0, 
        organic: totalClicks 
      },
      totalReach: { 
        total: totalReach, 
        paid: 0, 
        organic: totalReach 
      },
      totalMediaValue: totalSpend
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Real analytics, no synthetic network data ──
router.get('/analytics', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const [totalCampaigns, totalAds, performances] = await Promise.all([
      Campaign.countDocuments({ userId }),
      Ad.countDocuments({ userId }),
      Performance.find({ userId }).sort({ fetchedAt: 1 }),
    ]);

    const totals = performances.reduce((acc, perf) => {
      acc.spend += perf.spend || 0;
      acc.leads += perf.leads || 0;
      acc.clicks += perf.clicks || 0;
      acc.impressions += perf.impressions || 0;
      acc.reach += perf.reach || 0;
      acc.conversions += perf.conversions || 0;
      return acc;
    }, { spend: 0, leads: 0, clicks: 0, impressions: 0, reach: 0, conversions: 0 });

    const platformMap = new Map();
    for (const perf of performances) {
      const platform = perf.platform || 'unknown';
      const current = platformMap.get(platform) || { platform, spend: 0, leads: 0, clicks: 0, impressions: 0 };
      current.spend += perf.spend || 0;
      current.leads += perf.leads || 0;
      current.clicks += perf.clicks || 0;
      current.impressions += perf.impressions || 0;
      platformMap.set(platform, current);
    }

    const trendMap = new Map();
    for (const perf of performances) {
      const date = (perf.fetchedAt || perf.createdAt || new Date()).toISOString().slice(0, 10);
      const current = trendMap.get(date) || { date, leads: 0, clicks: 0, spend: 0, impressions: 0 };
      current.leads += perf.leads || 0;
      current.clicks += perf.clicks || 0;
      current.spend += perf.spend || 0;
      current.impressions += perf.impressions || 0;
      trendMap.set(date, current);
    }

    res.json({
      totalCampaigns,
      totalAds,
      totals,
      derived: {
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        cpl: totals.leads > 0 ? totals.spend / totals.leads : 0,
      },
      trend: Array.from(trendMap.values()).slice(-30),
      platforms: Array.from(platformMap.values()),
      hasData: performances.length > 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Reporting Table Data ──
router.get('/reporting-table', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const userId = new mongoose.Types.ObjectId(req.userId);
    
    const tableData = await Campaign.aggregate([
      { $match: { userId: userId } },
      {
        $lookup: {
          from: 'mbperformances',
          localField: '_id',
          foreignField: 'campaignId',
          as: 'performances'
        }
      },
      {
        $project: {
          _id: 1,
          idea: 1,
          status: 1,
          industry: "$ideaExpansion.industry",
          spend: { $sum: "$performances.spend" },
          impressions: { $sum: "$performances.impressions" },
          clicks: { $sum: "$performances.clicks" },
          leads: { $sum: "$performances.leads" },
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json(tableData);
  } catch (err) {
    console.error("Error in /reporting-table:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Best performing content ──
router.get('/best-content', auth, async (req, res) => {
  try {
    const userId = req.userId;
    const ads = await Ad.find({ userId });

    const results = await Promise.all(ads.map(async (ad) => {
      const perf = await Performance.findOne({ adId: ad._id }).sort({ fetchedAt: -1 });
      if (!perf) return null;
      return {
        adId: ad._id,
        campaignId: ad.campaignId,
        adCopy: ad.adCopy,
        headline: ad.headline,
        hook: ad.hook,
        platform: ad.platform,
        ctr: perf.ctr,
        leads: perf.leads,
        spend: perf.spend,
        cpl: perf.cpl,
      };
    }));

    const filtered = results.filter(Boolean).sort((a, b) => (b.ctr || 0) - (a.ctr || 0));
    res.json(filtered.slice(0, 10));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
