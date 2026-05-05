const AdCreativeMemory = require('../../models/AdCreativeMemory');

async function storeAdMemory(userId, input = {}) {
  if (!userId) return null;
  return AdCreativeMemory.create({
    userId,
    prompt: input.prompt || '',
    sector: input.sector || '',
    audience: input.audience || '',
    creativeType: input.creativeType || '',
    adName: input.adName || '',
    adText: input.adText || '',
    headline: input.headline || '',
    cta: input.cta || '',
    score: Number(input.score || 0),
    ctr: Number(input.ctr || 0),
    conversion: Number(input.conversion || 0),
    riskScore: Number(input.riskScore || 0),
    tokens: Number(input.tokens || 0),
    cost: Number(input.cost || 0),
    metadata: input.metadata || {},
  });
}

async function getAdHistory(userId, options = {}) {
  if (!userId) return [];
  const query = { userId };
  if (options.sector) query.sector = options.sector;
  return AdCreativeMemory.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(options.limit || 20), 100))
    .lean();
}

async function compareWithHistory(userId, current = {}) {
  const history = await getAdHistory(userId, { sector: current.sector, limit: 10 });
  const previous = history[0];
  if (!previous) {
    return {
      hasHistory: false,
      summary: 'No previous ad creative history yet. This run becomes the baseline.',
      improvementPercent: 0,
    };
  }

  const previousScore = Number(previous.score || 0);
  const currentScore = Number(current.score || 0);
  const improvementPercent = previousScore > 0 ? Number((((currentScore - previousScore) / previousScore) * 100).toFixed(1)) : 0;

  return {
    hasHistory: true,
    previousScore,
    currentScore,
    improvementPercent,
    summary: improvementPercent >= 0
      ? `This ad scores ${improvementPercent}% better than the latest saved creative in this sector.`
      : `This ad scores ${Math.abs(improvementPercent)}% below the latest saved creative in this sector.`,
    previous: {
      adName: previous.adName,
      headline: previous.headline,
      score: previous.score,
      ctr: previous.ctr,
      conversion: previous.conversion,
      createdAt: previous.createdAt,
    },
  };
}

module.exports = { storeAdMemory, getAdHistory, compareWithHistory };
