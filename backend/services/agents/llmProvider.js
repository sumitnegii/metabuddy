const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const AgentLog = require('../../models/AgentLog');

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MOCK_DATA = {
  IdeaAgent: {
    targetAudience: ["E-commerce brand owners", "Small business entrepreneurs", "Direct-to-consumer marketers"],
    painPoints: ["High cost per acquisition", "Struggling to find winning creatives", "Complex Meta Ads Manager interface", "Inconsistent ROAS"],
    marketAngle: "The 'Auto-Pilot' Growth Partner",
    usp: ["24/7 AI Optimization", "Instant Ad Generation", "Revenue-First Tracking"],
    industry: "SaaS / AdTech",
    competitorInsights: "Most competitors provide tools, not results. MetaBuddy focuses on autonomous revenue growth."
  },
  StrategyAgent: {
    phases: [
      { name: "Discovery", budget: "20%", focus: "Hook testing and audience identification" },
      { name: "Scaling", budget: "60%", focus: "Vertical scaling of winning creatives" },
      { name: "Retargeting", budget: "20%", focus: "Closing the gap on mid-funnel users" }
    ],
    logicLayers: ["Dynamic Creative Optimization", "Value-Based Lookalikes", "Broad Interest Targeting"]
  },
  ContentAgent: {
    content: [
      { hook: "Stop guessing. Start selling.", headline: "The AI Engine for Your Meta Ads", cta: "Launch Now" },
      { hook: "Your brand deserves better ROAS.", headline: "Autonomous Ad Scaling is Here", cta: "Start Free" },
      { hook: "Tired of complicated ad managers?", headline: "Idea to Revenue in 3 clicks", cta: "Get Started" }
    ]
  },
  CreativeAgent: {
    visualConcepts: [
      { concept: "Floating Ad Feed", elements: ["Scroll illusion", "Modern UI", "Vibrant colors"] },
      { concept: "Data Dashboard", elements: ["Growth charts", "Profit numbers", "Green accents"] }
    ]
  },
  OptimizationAgent: {
    rules: [
      { condition: "CTR < 0.5%", action: "Pause Ad" },
      { condition: "ROAS > 3.0x", action: "Scale Budget by 20%" }
    ]
  }
};

async function generateJSON(options) {
  const { provider, systemPrompt, userPrompt, agentName, userId, campaignId } = options;
  const startTime = Date.now();
  let responseText = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let modelName = '';

  if (process.env.USE_DUMMY_AI === 'true') {
    console.log(`[DUMMY] Returning mock data for ${agentName}`);
    return JSON.stringify(MOCK_DATA[agentName] || { info: "No mock data available" });
  }

  const finish = async () => {
    const durationMs = Date.now() - startTime;
    if (userId && campaignId) {
      AgentLog.create({
        userId,
        campaignId,
        agentName,
        provider,
        model: modelName,
        promptTokens,
        completionTokens,
        durationMs
      }).catch(err => console.error('Failed to log agent usage:', err));
    }
    return responseText;
  };

  try {
    const providersToTry = provider === 'gemini' ? ['gemini', 'claude'] : ['claude', 'gemini'];
    let lastError = null;
    const attempted = [];

    for (const p of providersToTry) {
      try {
        if (p === 'gemini') {
          const geminiModels = [...new Set([
            process.env.GEMINI_MODEL,
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-flash-001',
          ].filter(Boolean))];
          for (const m of geminiModels) {
            try {
              attempted.push(`gemini:${m}`);
              modelName = m;
              const model = gemini.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
              const result = await model.generateContent(userPrompt);
              const response = await result.response;
              responseText = response.text();
              if (response.usageMetadata) {
                promptTokens = response.usageMetadata.promptTokenCount;
                completionTokens = response.usageMetadata.candidatesTokenCount;
              }
              return finish();
            } catch (err) {
              console.warn(`Gemini model ${m} failed: ${err.message}`);
              lastError = err;
            }
          }
        } else {
          const claudeModels = [...new Set([
            process.env.CLAUDE_MODEL,
            'claude-sonnet-4-5-20250929',
            'claude-haiku-4-5-20251001',
            'claude-sonnet-4-20250514',
            'claude-3-5-sonnet-20241022',
          ].filter(Boolean))];
          for (const m of claudeModels) {
            try {
              attempted.push(`claude:${m}`);
              modelName = m;
              const response = await anthropic.messages.create({
                model: modelName,
                max_tokens: 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
              });
              responseText = response.content[0].text;
              if (response.usage) {
                promptTokens = response.usage.input_tokens;
                completionTokens = response.usage.output_tokens;
              }
              return finish();
            } catch (err) {
              console.warn(`Claude model ${m} failed: ${err.message}`);
              lastError = err;
            }
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`Provider ${p} failed entirely, trying next provider...`);
      }
    }
    if (lastError) {
      throw new Error(`AI providers failed for ${agentName}. Tried ${attempted.join(', ')}. Last error: ${lastError.message}`);
    }
  } catch (error) {
    console.error(`All AI providers failed for ${agentName}:`, error);
    throw error;
  }

  return finish();
}

module.exports = { generateJSON };
