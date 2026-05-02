const router = require('express').Router();
const auth = require('../middleware/auth');
const AgentLog = require('../models/AgentLog');
const Agent = require('../models/Agent');
const AgentJob = require('../models/AgentJob');

const AGENT_DIRECTORY = [
  { templateId: 'copy-pro', name: 'Copywriter Pro', role: 'Copywriting', costPerTask: 0.15, performanceScore: 98, skills: ['Direct Response', 'Storytelling'], avatar: '✍️', bio: 'Expert at writing high-converting Meta ad copy.', model: 'claude-sonnet-4-5' },
  { templateId: 'creative-director', name: 'Creative Director', role: 'Creative', costPerTask: 0.20, performanceScore: 95, skills: ['Visual Strategy', 'Hook Generation'], avatar: '🎨', bio: 'Designs visual concepts and video hooks that stop the scroll.', model: 'gemini-2.5-flash' },
  { templateId: 'strategist', name: 'Campaign Strategist', role: 'Strategy', costPerTask: 0.25, performanceScore: 99, skills: ['Audience Research', 'Budget Allocation'], avatar: '🧠', bio: 'Maps out the full funnel strategy and targeting.', model: 'claude-sonnet-4-5' },
  { templateId: 'media-buyer', name: 'Media Buyer AI', role: 'Optimization', costPerTask: 0.10, performanceScore: 94, skills: ['Bid Management', 'A/B Testing'], avatar: '📈', bio: 'Constantly monitors ROAS and shifts budget to winning ads.', model: 'gemini-2.5-flash' },
  { templateId: 'tiktok-specialist', name: 'Gen Z Specialist', role: 'Copywriting', costPerTask: 0.12, performanceScore: 91, skills: ['Trend Spotting', 'Short Form Video'], avatar: '📱', bio: 'Writes scripts tailored for TikTok and Reels.', model: 'claude-haiku-4-5' },
];

function currentModelLabel(agent) {
  if (agent.role === 'Creative' || agent.role === 'Optimization') return 'gemini-2.5-flash';
  if (agent.model?.includes('haiku')) return 'claude-haiku-4-5';
  return 'claude-sonnet-4-5';
}

function serializeAgent(agent) {
  const data = typeof agent.toObject === 'function' ? agent.toObject() : { ...agent };
  data.model = currentModelLabel(data);
  return data;
}

// ── Agent Directory & Hiring ──

// Get the marketplace of available agents
router.get('/directory', auth, async (req, res) => {
  try {
    // Check which ones the user already hired
    const hiredAgents = await Agent.find({ userId: req.userId }).select('templateId');
    const hiredIds = hiredAgents.map(a => a.templateId);
    
    const directory = AGENT_DIRECTORY.map(agent => ({
      ...agent,
      isHired: hiredIds.includes(agent.templateId)
    }));
    
    res.json(directory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hire an agent
router.post('/hire', auth, async (req, res) => {
  try {
    const { templateId } = req.body;
    const template = AGENT_DIRECTORY.find(a => a.templateId === templateId);
    if (!template) return res.status(404).json({ error: 'Agent template not found' });
    
    const existing = await Agent.findOne({ userId: req.userId, templateId });
    if (existing) return res.status(400).json({ error: 'Agent already hired' });
    
    const newAgent = new Agent({
      userId: req.userId,
      ...template,
      budgetAllocated: 100 // Default $100 budget
    });
    
    await newAgent.save();
    res.json(newAgent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's hired team
router.get('/team', auth, async (req, res) => {
  try {
    const team = await Agent.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(team.map(serializeAgent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update agent budget
router.put('/:id/budget', auth, async (req, res) => {
  try {
    const { budgetAllocated } = req.body;
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { budgetAllocated },
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activate or pause an agent for future campaign work
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['idle', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'status must be idle or paused' });
    }

    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status },
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get agent usage stats
router.get('/usage', auth, async (req, res) => {
  try {
    const [logs, jobs, team] = await Promise.all([
      AgentLog.find({ userId: req.userId })
      .populate('campaignId', 'idea')
      .sort({ createdAt: -1 })
        .limit(100),
      AgentJob.find({ userId: req.userId })
        .populate('agentId', 'name role model performanceScore')
        .sort({ createdAt: -1 })
        .limit(100),
      Agent.find({ userId: req.userId }).sort({ createdAt: -1 }),
    ]);

    const totalCalls = await AgentLog.countDocuments({ userId: req.userId });
    
    const tokenAggregation = await AgentLog.aggregate([
      { $match: { userId: req.userId } },
      { 
        $group: {
          _id: "$provider",
          totalPromptTokens: { $sum: "$promptTokens" },
          totalCompletionTokens: { $sum: "$completionTokens" },
          totalCalls: { $sum: 1 },
          avgDurationMs: { $avg: "$durationMs" }
        }
      }
    ]);

    const claudeStats = tokenAggregation.find(a => a._id === 'claude') || { totalPromptTokens: 0, totalCompletionTokens: 0, totalCalls: 0, avgDurationMs: 0 };
    const geminiStats = tokenAggregation.find(a => a._id === 'gemini') || { totalPromptTokens: 0, totalCompletionTokens: 0, totalCalls: 0, avgDurationMs: 0 };

    const jobCountsByDay = jobs.reduce((acc, job) => {
      const date = (job.createdAt || new Date()).toISOString().slice(0, 10);
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const totalJobCount = jobs.length;
    const completedJobCount = jobs.filter((job) => job.status === 'completed').length;
    const failedJobCount = jobs.filter((job) => job.status === 'failed').length;

    res.json({
      totalCalls,
      claudeStats,
      geminiStats,
      recentLogs: logs,
      jobs,
      team,
      summary: {
        totalInvocations: totalCalls + totalJobCount,
        totalAgentJobs: totalJobCount,
        completedAgentJobs: completedJobCount,
        failedAgentJobs: failedJobCount,
        activeAgents: team.filter((agent) => agent.status !== 'paused').length,
        totalCredits: team.reduce((sum, agent) => sum + (agent.budgetSpent || 0), 0),
        avgLatencyMs: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.durationMs || 0), 0) / logs.length : 0,
      },
      jobsByDay: Object.entries(jobCountsByDay).map(([date, count]) => ({ date, count })),
    });
  } catch (err) {
    console.error('Fetch agent usage error:', err);
    res.status(500).json({ error: err.message });
  }
});

const AgentTrainingLog = require('../models/AgentTrainingLog');

// Get all training/optimization logs
router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await AgentTrainingLog.find({ userId: req.userId })
      .populate('campaignId', 'idea')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
