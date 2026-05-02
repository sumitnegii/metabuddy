const { extractJSON } = require("./jsonExtractor");
const { generateJSON } = require("./llmProvider");

async function optimizeCampaign(campaign, content, strategy) {
  const { idea, ideaExpansion, aiProvider, userId, _id: campaignId } = campaign;
  const topCopies = (content.adCopies || []).slice(0, 3);
  
  const responseText = await generateJSON({
    provider: aiProvider || 'claude',
    systemPrompt: 'You are an ad optimization expert. Improve ad content and suggest A/B test variants. Return ONLY valid JSON.',
    userPrompt: `Optimize this campaign:\n\nIdea: "${idea}"\nTarget Audience: ${JSON.stringify(ideaExpansion.targetAudience)}\nTop Ad Copies:\n${topCopies.map((c, i) => `${i + 1}. Hook: "${c.hook}" | Headline: "${c.headline}" | CTA: "${c.cta}"`).join('\n')}\nBudget: ${strategy.totalBudgetSuggestion || 'Not specified'}\n\nReturn JSON:\n{\n  "abVariants": [\n    { "original": "<original hook>", "variant": "<improved A/B variant>", "reason": "<why this might perform better>" },\n    { "original": "<original hook>", "variant": "<improved A/B variant>", "reason": "<why>" }\n  ],\n  "targetingTips": [\n    "<targeting suggestion 1>",\n    "<targeting suggestion 2>",\n    "<targeting suggestion 3>",\n    "<targeting suggestion 4>"\n  ],\n  "budgetAdvice": "<specific budget optimization advice>",\n  "performancePrediction": "<expected performance summary>"\n}`,
    agentName: 'OptimizationAgent',
    userId,
    campaignId
  });

  return extractJSON(responseText);
}


module.exports = { optimizeCampaign };
