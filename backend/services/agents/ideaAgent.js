const { extractJSON } = require("./jsonExtractor");
const { generateJSON } = require("./llmProvider");

async function expandIdea(campaign, previousExpansion = null, feedback = null) {
  const { idea, aiProvider, userId, _id: campaignId } = campaign;
  let promptContent = `Analyze this business/product idea for advertising:\n\n"${idea}"\n`;

  if (previousExpansion && feedback) {
    promptContent += `\nHere is your previous analysis:\n${JSON.stringify(previousExpansion, null, 2)}\n`;
    promptContent += `\nThe user has provided the following feedback to adjust the analysis: "${feedback}"\n`;
    promptContent += `\nPlease refine the previous analysis incorporating this feedback.\n`;
  }

  promptContent += `\nReturn JSON:\n{\n  "targetAudience": ["<demographic 1>", "<demographic 2>", "<demographic 3>"],\n  "painPoints": ["<pain 1>", "<pain 2>", "<pain 3>", "<pain 4>"],\n  "marketAngle": "<the best angle to market this>",\n  "usp": ["<unique selling point 1>", "<unique selling point 2>", "<unique selling point 3>"],\n  "industry": "<industry name>",\n  "competitorInsights": "<what competitors are doing and how to differentiate>"\n}`;

  const responseText = await generateJSON({
    provider: aiProvider || 'claude',
    systemPrompt: 'You are a marketing strategist. Analyze business ideas and identify target audiences, pain points, and market positioning. Return ONLY valid JSON without markdown.',
    userPrompt: promptContent,
    agentName: 'IdeaAgent',
    userId,
    campaignId
  });

  return extractJSON(responseText);
}

module.exports = { expandIdea };
