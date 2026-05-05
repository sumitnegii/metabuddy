const McpCostLog = require('../../models/McpCostLog');

async function trackCost(userId, input = {}) {
  if (!userId) return null;
  return McpCostLog.create({
    userId,
    agent: input.agent || 'unknown',
    tokens: Number(input.tokens || 0),
    cost: Number(input.cost || 0),
    requestId: input.requestId || '',
    source: input.source || 'ad-creative-pipeline',
    metadata: input.metadata || {},
  });
}

async function trackCostBatch(userId, entries = [], requestId = '') {
  if (!userId || !entries.length) return [];
  return Promise.all(entries.map((entry) => trackCost(userId, { ...entry, requestId })));
}

async function getCostSummary(userId, options = {}) {
  if (!userId) return { totalTokens: 0, totalCost: 0, byAgent: [] };
  const match = { userId };
  if (options.agent) match.agent = options.agent;

  const byAgent = await McpCostLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$agent',
        tokens: { $sum: '$tokens' },
        cost: { $sum: '$cost' },
        calls: { $sum: 1 },
      },
    },
    { $sort: { cost: -1 } },
  ]);

  return {
    totalTokens: byAgent.reduce((sum, item) => sum + (item.tokens || 0), 0),
    totalCost: Number(byAgent.reduce((sum, item) => sum + (item.cost || 0), 0).toFixed(4)),
    byAgent: byAgent.map((item) => ({
      agent: item._id,
      tokens: item.tokens,
      cost: Number((item.cost || 0).toFixed(4)),
      calls: item.calls,
    })),
  };
}

module.exports = { trackCost, trackCostBatch, getCostSummary };
