const MetaService = require('./metaService');
const Ad = require('../models/Ad');
const Campaign = require('../models/Campaign');
const Performance = require('../models/Performance');
const AgentTrainingLog = require('../models/AgentTrainingLog');
const { generateCampaignContent } = require('./agentOrchestrator');

/**
 * Automated Growth Loop Service
 * Manages the "Post -> Track -> Analyze -> Improve" cycle.
 */

/**
 * 1. Launch Loop: Takes a generated campaign and pushes it to Meta
 */
async function launchCampaignToMeta(campaignId, userId, pageId) {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error('Campaign not found');

  console.log(`🚀 Launching Campaign to Meta: ${campaign.idea}`);

  // Create Campaign
  const metaCampaignId = await MetaService.createCampaign(`MB_${campaign.idea.substring(0, 20)}`);
  
  // Update Campaign Status
  campaign.status = 'posted';
  await campaign.save();

  // Create Ad Set
  const adSetId = await MetaService.createAdSet(metaCampaignId, 'AI Optimized AdSet', 1000);

  // Create Ads for each generated copy
  for (const copy of campaign.content.adCopies) {
    console.log(`📝 Creating Ad for copy: ${copy.headline}`);
    
    const creativeId = await MetaService.createAdCreative(
      `Creative_${copy.copyId}`,
      pageId,
      copy.body,
      'https://metabuddy.ai', // Default link
      'https://via.placeholder.com/1200x628' // Default image
    );

    const platformAdId = await MetaService.createAd(adSetId, creativeId, `Ad_${copy.headline}`);

    // Save Ad to DB
    await Ad.create({
      campaignId,
      userId,
      generatedCopyId: copy.copyId,
      platform: 'meta',
      platformAdId,
      adCopy: copy.body,
      headline: copy.headline,
      hook: copy.hook,
      cta: copy.cta,
      status: 'live',
      postedAt: new Date()
    });
  }

  return { metaCampaignId, adSetId };
}

/**
 * 2. Optimization Loop: Fetches metrics and makes decisions
 */
async function trackAndOptimize() {
  console.log('📊 Running Optimization Loop...');
  const activeAds = await Ad.find({ status: 'live' });

  for (const ad of activeAds) {
    try {
      const insights = await MetaService.fetchAdInsights(ad.platformAdId);
      
      // Save Performance to DB
      await Performance.create({
        adId: ad._id,
        campaignId: ad.campaignId,
        userId: ad.userId,
        platform: 'meta',
        externalId: ad.platformAdId,
        ...insights
      });

      // Decision Engine (Simple Rules)
      if (insights.impressions > 100) {
        if (insights.ctr < 0.5) {
          console.log(`🛑 Pausing low performing ad: ${ad.headline} (CTR: ${insights.ctr}%)`);
          await MetaService.updateAdStatus(ad.platformAdId, 'PAUSED');
          ad.status = 'paused';
          await ad.save();

          // Log the learning
          await AgentTrainingLog.create({
            campaignId: ad.campaignId,
            agentName: 'Optimizer',
            input: `Headline: ${ad.headline}, CTR: ${insights.ctr}`,
            output: 'Ad paused due to low CTR',
            feedback: 'negative',
            learningPoint: `The hook "${ad.hook}" did not resonate with the audience.`
          });
        } else if (insights.ctr > 2.0) {
          console.log(`📈 High performing ad found: ${ad.headline} (CTR: ${insights.ctr}%)`);
          
          // Log the learning
          await AgentTrainingLog.create({
            campaignId: ad.campaignId,
            agentName: 'Optimizer',
            input: `Headline: ${ad.headline}, CTR: ${insights.ctr}`,
            output: 'Keep running and scale',
            feedback: 'positive',
            learningPoint: `The combination of "${ad.headline}" and hook "${ad.hook}" is winning.`
          });
        }
      }
    } catch (err) {
      console.error(`Error tracking ad ${ad.platformAdId}:`, err.message);
    }
  }
}

/**
 * 3. Learning Loop: Improve campaign based on historical performance
 */
async function improveCampaign(campaignId) {
  const campaign = await Campaign.findById(campaignId);
  const insights = await AgentTrainingLog.find({ campaignId });

  const learningPrompt = insights.map(i => `- ${i.learningPoint}`).join('\n');
  
  console.log('🤖 Improving campaign based on learnings...');
  
  // Re-run the orchestrator with feedback
  const updatedCampaign = await generateCampaignContent(campaign, null, learningPrompt);
  
  campaign.content = updatedCampaign.content;
  campaign.optimization = updatedCampaign.optimization;
  await campaign.save();

  return campaign;
}

module.exports = {
  launchCampaignToMeta,
  trackAndOptimize,
  improveCampaign
};
