/**
 * Agent Orchestrator
 * Runs all 5 agents in sequence, each building on the previous output.
 */
const { expandIdea } = require('./agents/ideaAgent');
const { buildStrategy } = require('./agents/strategyAgent');
const { generateContent } = require('./agents/contentAgent');
const { generateCreative } = require('./agents/creativeAgent');
const { optimizeCampaign } = require('./agents/optimizationAgent');

async function generateIdeaExpansion(campaign, previousExpansion = null, feedback = null, onProgress = null) {
  if (onProgress) onProgress(1, 'Expanding your idea');
  console.log(`🤖 Agent 1/5: Expanding your idea...`);
  const ideaExpansion = await expandIdea(campaign, previousExpansion, feedback);
  return { ideaExpansion };
}

async function generateCampaignContent(campaign, onProgress = null) {
  const { idea, ideaExpansion } = campaign;
  const progress = (step, name) => {
    if (onProgress) onProgress(step, name);
    console.log(`🤖 Agent ${step}/5: ${name}...`);
  };

  // Agent 2: Strategy
  progress(2, 'Building campaign strategy');
  const strategy = await buildStrategy(campaign);

  // Agent 3: Content Generation (CORE)
  progress(3, 'Creating ad content');
  const content = await generateContent(campaign, strategy);

  // Agent 4: Creative Direction
  progress(4, 'Designing creative concepts');
  const creative = await generateCreative(campaign, content);

  // Agent 5: Optimization
  progress(5, 'Optimizing campaign');
  const optimization = await optimizeCampaign(campaign, content, strategy);

  return {
    strategy,
    content,
    creative,
    optimization,
    status: 'ready',
  };
}

module.exports = { generateIdeaExpansion, generateCampaignContent };
