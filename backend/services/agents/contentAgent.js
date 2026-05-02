const { extractJSON } = require("./jsonExtractor");
const { generateJSON } = require("./llmProvider");

async function generateContent(campaign, strategy) {
  const { idea, ideaExpansion, aiProvider, userId, _id: campaignId } = campaign;
  const responseText = await generateJSON({
    provider: aiProvider || 'claude',
    systemPrompt: 'You are an elite Meta/Instagram ad copywriter. Write compelling, scroll-stopping ad content. Return ONLY valid JSON.',
    userPrompt: `Create full ad content for:\n\nIdea: "${idea}"\nTarget Audience: ${JSON.stringify(ideaExpansion.targetAudience)}\nPain Points: ${JSON.stringify(ideaExpansion.painPoints)}\nUSP: ${JSON.stringify(ideaExpansion.usp)}\nMarket Angle: ${ideaExpansion.marketAngle}\nFunnel: ${JSON.stringify(strategy.funnel)}\nPlatforms: ${JSON.stringify(strategy.platforms)}\n\nGenerate 6 ad copies (2 per funnel stage). Each must have a unique ID.\nAlso generate 5 standalone hooks and 5 standalone headlines.\n\nReturn JSON:\n{\n  "adCopies": [\n    {\n      "copyId": "copy_1",\n      "funnelStage": "awareness",\n      "platform": "meta",\n      "headline": "<short punchy headline>",\n      "hook": "<scroll-stopping first line>",\n      "body": "<full ad body text, 3-4 sentences>",\n      "cta": "<call to action>",\n      "hashtags": ["#tag1", "#tag2"]\n    }\n  ],\n  "hooks": ["<hook1>", "<hook2>", "<hook3>", "<hook4>", "<hook5>"],\n  "headlines": ["<headline1>", "<headline2>", "<headline3>", "<headline4>", "<headline5>"]\n}`,
    agentName: 'ContentAgent',
    userId,
    campaignId
  });

  return extractJSON(responseText);
}


module.exports = { generateContent };
