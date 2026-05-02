const { extractJSON } = require("./jsonExtractor");
const { generateJSON } = require("./llmProvider");

async function generateCreative(campaign, content) {
  const { idea, ideaExpansion, aiProvider, userId, _id: campaignId } = campaign;
  const responseText = await generateJSON({
    provider: aiProvider || 'claude',
    systemPrompt: 'You are a creative director for social media ads. Suggest visuals, videos, and creative concepts. Return ONLY valid JSON.',
    userPrompt: `Create visual/creative suggestions for these ads:\n\nIdea: "${idea}"\nIndustry: ${ideaExpansion.industry || 'General'}\nAd Copies: ${JSON.stringify(content.adCopies?.slice(0, 3).map(c => c.headline))}\n\nReturn JSON:\n{\n  "imageDescriptions": [\n    "<detailed image description for ad 1>",\n    "<detailed image description for ad 2>",\n    "<detailed image description for ad 3>"\n  ],\n  "videoScripts": [\n    { "title": "<video title>", "duration": "30s", "script": "<scene-by-scene script>" },\n    { "title": "<video title>", "duration": "15s", "script": "<scene-by-scene script>" }\n  ],\n  "reelsIdeas": [\n    "<reel idea 1>",\n    "<reel idea 2>",\n    "<reel idea 3>"\n  ],\n  "carouselSlides": [\n    { "slideNumber": 1, "content": "<text>", "visual": "<visual description>" },\n    { "slideNumber": 2, "content": "<text>", "visual": "<visual description>" },\n    { "slideNumber": 3, "content": "<text>", "visual": "<visual description>" },\n    { "slideNumber": 4, "content": "<text>", "visual": "<visual description>" }\n  ],\n  "colorPalette": ["#hex1", "#hex2", "#hex3"],\n  "moodDescription": "<overall mood/aesthetic>"\n}`,
    agentName: 'CreativeAgent',
    userId,
    campaignId
  });

  return extractJSON(responseText);
}


module.exports = { generateCreative };
