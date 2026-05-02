const router = require('express').Router();
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const Campaign = require('../models/Campaign');
const Agent = require('../models/Agent');
const { generateIdeaExpansion, generateCampaignContent } = require('../services/agentOrchestrator');
const { predictCampaign } = require('../services/prediction');
const AgentTrainingLog = require('../models/AgentTrainingLog');

// ── Step 1: Generate Idea Expansion ──
router.post('/idea', auth, async (req, res) => {
  try {
    const { idea, aiProvider, selectedAgentIds = [], automationLevel = 'draft', launchConfig = {} } = req.body;
    if (!idea || !idea.trim()) return res.status(400).json({ error: 'idea is required' });
    const requestedAgentIds = Array.isArray(selectedAgentIds) ? selectedAgentIds : [];
    const hiredAgents = requestedAgentIds.length > 0
      ? await Agent.find({ _id: { $in: requestedAgentIds }, userId: req.userId })
      : await Agent.find({ userId: req.userId }).limit(5);
    if (hiredAgents.length === 0) {
      return res.status(400).json({ error: 'Hire at least one agent before creating a campaign' });
    }
    if (requestedAgentIds.length > 0 && hiredAgents.length !== requestedAgentIds.length) {
      return res.status(400).json({ error: 'One or more selected agents are not on your team' });
    }

    const campaign = await Campaign.create({ 
      userId: req.userId, 
      idea: idea.trim(), 
      status: 'idea_pending',
      aiProvider: aiProvider || 'gemini',
      selectedAgentIds: hiredAgents.map((agent) => agent._id),
      automationLevel,
      launchConfig: {
        objective: launchConfig.objective || 'OUTCOME_TRAFFIC',
        websiteUrl: launchConfig.websiteUrl || '',
        country: launchConfig.country || '',
        dailyBudget: Number(launchConfig.dailyBudget || 0),
      },
    });

    
    const result = await generateIdeaExpansion(campaign);
    
    campaign.ideaExpansion = result.ideaExpansion;
    await campaign.save();

    res.status(201).json(campaign);
  } catch (err) {
    console.error('Generate idea error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Step 1.5: Refine Idea Expansion ──
router.put('/:id/idea', auth, async (req, res) => {
  try {
    const { feedback } = req.body;
    if (!feedback || !feedback.trim()) return res.status(400).json({ error: 'feedback is required' });

    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.userId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'idea_pending') return res.status(400).json({ error: 'Idea already approved' });

    const result = await generateIdeaExpansion(campaign, campaign.ideaExpansion, feedback.trim());
    
    campaign.ideaExpansion = result.ideaExpansion;
    await campaign.save();

    res.json(campaign);
  } catch (err) {
    console.error('Refine idea error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Step 2: Generate Full Campaign ──
router.post('/:id/generate', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.userId }).populate('selectedAgentIds', 'name role templateId');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'idea_pending') return res.status(400).json({ error: 'Campaign not in idea_pending status' });

    campaign.status = 'generating';
    await campaign.save();

    const result = await generateCampaignContent(campaign);

    campaign.strategy = result.strategy;
    campaign.content = result.content;
    campaign.creative = result.creative;
    campaign.optimization = result.optimization;
    campaign.status = 'ready';
    await campaign.save();

    res.json(campaign);
  } catch (err) {
    console.error('Generate full campaign error:', err);
    try {
      // Revert status so user can try again
      await Campaign.updateOne({ _id: req.params.id }, { status: 'idea_pending' });
    } catch (e) {}
    res.status(500).json({ error: err.message });
  }
});

// ── List campaigns ──
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.userId }).sort({ createdAt: -1 }).select('-creative -optimization');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Forecast endpoint ──
router.get('/:id/forecast', auth, rbac('marketer'), async (req, res) => {
  try {
    const { budget, durationDays, pricePerLead } = req.query;
    const prediction = await predictCampaign({ budget: Number(budget), durationDays: Number(durationDays), pricePerLead: Number(pricePerLead) });
    res.json({ prediction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Train agents endpoint ──
router.post('/:id/train', auth, rbac('admin'), async (req, res) => {
  try {
    const log = await AgentTrainingLog.create({
      campaignId: req.params.id,
      userId: req.userId,
      modelProvider: 'gemini',
      modelName: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      trainingStatus: 'queued',
      startedAt: new Date()
    });
    // Simulate immediate completion for now
    log.trainingStatus = 'completed';
    log.completedAt = new Date();
    await log.save();
    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get single campaign (full detail) ──
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ _id: req.params.id, userId: req.userId });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete campaign ──
router.delete('/:id', auth, async (req, res) => {
  try {
    await Campaign.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Content Approval Endpoints ──
// Get all pending content across all campaigns
router.get('/content/pending', auth, async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.userId, "content.adCopies.approvalStatus": "pending" }).select('idea content.adCopies');
    
    // Flatten into a list of ad copies with campaign info attached
    let pendingContent = [];
    campaigns.forEach(campaign => {
      if (campaign.content && campaign.content.adCopies) {
        campaign.content.adCopies.forEach(copy => {
          if (copy.approvalStatus === 'pending') {
            pendingContent.push({
              campaignId: campaign._id,
              campaignIdea: campaign.idea,
              ...copy.toObject()
            });
          }
        });
      }
    });

    res.json(pendingContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve or reject a specific ad copy
router.put('/content/:campaignId/copy/:copyId', auth, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const campaign = await Campaign.findOneAndUpdate(
      { _id: req.params.campaignId, userId: req.userId, "content.adCopies.copyId": req.params.copyId },
      { $set: { "content.adCopies.$.approvalStatus": status } },
      { new: true }
    );

    if (!campaign) return res.status(404).json({ error: 'Campaign or Copy not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
