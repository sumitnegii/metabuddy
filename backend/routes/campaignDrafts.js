const router = require('express').Router();
const auth = require('../middleware/auth');
const Agent = require('../models/Agent');
const CampaignDraft = require('../models/CampaignDraft');
const AgentJob = require('../models/AgentJob');
const ApprovalRequest = require('../models/ApprovalRequest');
const { expandIdea } = require('../services/agents/ideaAgent');
const { buildStrategy } = require('../services/agents/strategyAgent');
const { generateContent } = require('../services/agents/contentAgent');
const { generateCreative } = require('../services/agents/creativeAgent');
const { optimizeCampaign } = require('../services/agents/optimizationAgent');
const { publishApprovedDraftToMeta } = require('../services/metaAdsV2Service');

const JOB_SEQUENCE = [
  { jobType: 'idea', agentRole: 'Strategy', outputKey: 'ideaExpansion' },
  { jobType: 'strategy', agentRole: 'Strategy', outputKey: 'strategy' },
  { jobType: 'content', agentRole: 'Copywriting', outputKey: 'content' },
  { jobType: 'creative', agentRole: 'Creative', outputKey: 'creative' },
  { jobType: 'optimization', agentRole: 'Optimization', outputKey: 'optimization' },
];

function normalizeWebsiteUrl(value = '') {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function asCampaignInput(draft) {
  return {
    _id: draft._id,
    userId: draft.userId,
    idea: draft.brief,
    aiProvider: draft.aiProvider,
    ideaExpansion: draft.outputs.ideaExpansion,
  };
}

function pickAgentForRole(agents, role) {
  return agents.find((agent) => agent.role === role) || agents[0];
}

async function runJob(job, draft) {
  job.status = 'running';
  job.startedAt = new Date();
  await job.save();

  try {
    const campaignInput = asCampaignInput(draft);
    let output;
    if (job.jobType === 'idea') output = await expandIdea(campaignInput);
    if (job.jobType === 'strategy') output = await buildStrategy(campaignInput);
    if (job.jobType === 'content') output = await generateContent(campaignInput, draft.outputs.strategy);
    if (job.jobType === 'creative') output = await generateCreative(campaignInput, draft.outputs.content);
    if (job.jobType === 'optimization') output = await optimizeCampaign(campaignInput, draft.outputs.content, draft.outputs.strategy);

    job.output = output || {};
    job.status = 'completed';
    job.finishedAt = new Date();
    await job.save();
    return output || {};
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.finishedAt = new Date();
    await job.save();
    throw err;
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const drafts = await CampaignDraft.find({ userId: req.userId })
      .populate('selectedAgentIds', 'name role status model performanceScore')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ drafts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      brief,
      selectedAgentIds = [],
      aiProvider = 'gemini',
      automationLevel = 'paused_meta',
      launchConfig = {},
    } = req.body;

    if (!brief || !brief.trim()) return res.status(400).json({ error: 'brief is required' });
    if (!Array.isArray(selectedAgentIds) || selectedAgentIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one active agent' });
    }

    const agents = await Agent.find({ _id: { $in: selectedAgentIds }, userId: req.userId, status: { $ne: 'paused' } });
    if (agents.length !== selectedAgentIds.length) {
      return res.status(400).json({ error: 'Selected agents must be active and belong to your team' });
    }

    const dailyBudget = Number(launchConfig.dailyBudget || 0);
    const draft = await CampaignDraft.create({
      userId: req.userId,
      title: title || brief.trim().slice(0, 80),
      brief: brief.trim(),
      selectedAgentIds,
      aiProvider,
      automationLevel,
      launchConfig: {
        objective: launchConfig.objective || 'OUTCOME_TRAFFIC',
        websiteUrl: normalizeWebsiteUrl(launchConfig.websiteUrl),
        pageId: launchConfig.pageId || '',
        country: (launchConfig.country || 'IN').toUpperCase(),
        dailyBudget,
        dailyBudgetMinor: Number(launchConfig.dailyBudgetMinor || Math.round(dailyBudget * 100)),
      },
    });

    res.status(201).json({ draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const draft = await CampaignDraft.findOne({ _id: req.params.id, userId: req.userId })
      .populate('selectedAgentIds', 'name role status model performanceScore');
    if (!draft) return res.status(404).json({ error: 'Campaign draft not found' });

    const [jobs, approvals] = await Promise.all([
      AgentJob.find({ userId: req.userId, draftId: draft._id }).populate('agentId', 'name role model').sort({ createdAt: 1 }),
      ApprovalRequest.find({ userId: req.userId, draftId: draft._id }).sort({ createdAt: -1 }),
    ]);
    res.json({ draft, jobs, approvals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/run-agents', auth, async (req, res) => {
  try {
    const draft = await CampaignDraft.findOne({ _id: req.params.id, userId: req.userId });
    if (!draft) return res.status(404).json({ error: 'Campaign draft not found' });
    if (!['draft', 'failed'].includes(draft.status)) {
      return res.status(400).json({ error: `Draft cannot run agents while status is ${draft.status}` });
    }

    const agents = await Agent.find({ _id: { $in: draft.selectedAgentIds }, userId: req.userId, status: { $ne: 'paused' } });
    if (agents.length === 0) return res.status(400).json({ error: 'No active agents assigned to this draft' });

    await AgentJob.deleteMany({ userId: req.userId, draftId: draft._id });
    draft.status = 'agents_running';
    draft.failureReason = '';
    await draft.save();

    const outputs = {};
    for (const step of JOB_SEQUENCE) {
      const agent = pickAgentForRole(agents, step.agentRole);
      const job = await AgentJob.create({
        userId: req.userId,
        draftId: draft._id,
        agentId: agent?._id,
        agentRole: step.agentRole,
        jobType: step.jobType,
        input: {
          brief: draft.brief,
          previousOutputs: outputs,
        },
      });

      const output = await runJob(job, draft);
      outputs[step.outputKey] = output;
      draft.set(`outputs.${step.outputKey}`, output);
      await draft.save();

      if (agent) {
        agent.status = 'idle';
        agent.tasksCompleted = (agent.tasksCompleted || 0) + 1;
        agent.budgetSpent = Number((agent.budgetSpent || 0) + (agent.costPerTask || 0));
        await agent.save();
      }
    }

    draft.status = 'ready_for_review';
    await draft.save();

    const firstCopy = draft.outputs.content?.adCopies?.[0];
    const approval = await ApprovalRequest.create({
      userId: req.userId,
      draftId: draft._id,
      type: 'campaign_publish',
      title: `Approve Meta campaign: ${draft.title}`,
      summary: firstCopy?.headline || draft.brief,
      payload: {
        objective: draft.launchConfig.objective,
        websiteUrl: draft.launchConfig.websiteUrl,
        country: draft.launchConfig.country,
        dailyBudget: draft.launchConfig.dailyBudget,
        firstCopy,
      },
    });

    const jobs = await AgentJob.find({ userId: req.userId, draftId: draft._id }).populate('agentId', 'name role model').sort({ createdAt: 1 });
    res.json({ success: true, draft, jobs, approval });
  } catch (err) {
    await CampaignDraft.updateOne(
      { _id: req.params.id, userId: req.userId },
      { status: 'failed', failureReason: err.message }
    );
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const approval = await ApprovalRequest.findOne({
      userId: req.userId,
      draftId: req.params.id,
      type: 'campaign_publish',
      status: { $in: ['pending', 'approved'] },
    });
    if (!approval) return res.status(404).json({ error: 'Pending approval not found' });

    if (approval.status !== 'approved') {
      approval.status = 'approved';
      approval.approvedAt = new Date();
      await approval.save();
    }

    const draft = await CampaignDraft.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status: 'approved' },
      { new: true }
    );
    res.json({ success: true, draft, approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', auth, async (req, res) => {
  try {
    const approval = await ApprovalRequest.findOneAndUpdate(
      { userId: req.userId, draftId: req.params.id, type: 'campaign_publish', status: 'pending' },
      { status: 'rejected', rejectedAt: new Date() },
      { new: true }
    );
    if (!approval) return res.status(404).json({ error: 'Pending approval not found' });
    res.json({ success: true, approval });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish-meta', auth, async (req, res) => {
  try {
    const result = await publishApprovedDraftToMeta(req.userId, req.params.id);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
