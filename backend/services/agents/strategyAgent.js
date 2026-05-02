const { extractJSON } = require("./jsonExtractor");
const { generateJSON } = require("./llmProvider");

async function buildStrategy(campaign) {
  const { idea, ideaExpansion, aiProvider, userId, _id: campaignId } = campaign;
  const responseText = await generateJSON({
    provider: aiProvider || 'claude',
    systemPrompt: 'You are a digital advertising strategist. Return ONLY valid raw JSON without any markdown formatting like ```json. Do not include any wrappers like {"campaign": ...}.',
    userPrompt: `Build an advertising campaign strategy for:\n\nIdea: "${idea}"\nTarget Audience: ${JSON.stringify(ideaExpansion.targetAudience)}\nPain Points: ${JSON.stringify(ideaExpansion.painPoints)}\nMarket Angle: ${ideaExpansion.marketAngle}\nUSP: ${JSON.stringify(ideaExpansion.usp)}\n\nReturn EXACTLY this JSON structure and nothing else:\n{\n  "funnel": [\n    { "stage": "awareness", "goal": "<goal>", "kpi": "<key metric>", "budgetPercent": 40 },\n    { "stage": "consideration", "goal": "<goal>", "kpi": "<key metric>", "budgetPercent": 35 },\n    { "stage": "conversion", "goal": "<goal>", "kpi": "<key metric>", "budgetPercent": 25 }\n  ],\n  "platforms": ["Facebook", "Instagram"],\n  "budgetSplit": { "awareness": 40, "consideration": 35, "conversion": 25 },\n  "duration": 30,\n  "totalBudgetSuggestion": "<e.g. ₹15,000 - ₹30,000 for 30 days>",\n  "kpiTargets": { "ctr": "<target CTR>", "cpl": "<target CPL>", "reach": "<target reach>" }\n}`,
    agentName: 'StrategyAgent',
    userId,
    campaignId
  });

  return extractJSON(responseText);
}


module.exports = { buildStrategy };
