const mongoose = require('mongoose');

const adCopySchema = new mongoose.Schema({
  copyId: { type: String, required: true },
  funnelStage: { type: String, enum: ['awareness', 'consideration', 'conversion'] },
  platform: { type: String, default: 'meta' },
  headline: String,
  hook: String,
  body: String,
  cta: String,
  hashtags: [String],
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { _id: false });

const campaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  idea: { type: String, required: true },
  status: { type: String, enum: ['idea_pending', 'generating', 'ready', 'meta_paused', 'posted', 'tracking'], default: 'idea_pending' },
  aiProvider: { type: String, enum: ['claude', 'gemini'], default: 'gemini' },
  selectedAgentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MBAgent' }],
  automationLevel: { type: String, enum: ['draft', 'paused_meta', 'autopilot_recommendations'], default: 'draft' },
  launchConfig: {
    objective: { type: String, default: 'OUTCOME_TRAFFIC' },
    websiteUrl: String,
    country: String,
    dailyBudget: Number,
  },
  metaDraft: {
    campaignId: String,
    createdAt: Date,
    status: String,
  },


  // ── Agent 1: Idea Expansion ──
  ideaExpansion: {
    targetAudience: [{ type: String }],
    painPoints: [{ type: String }],
    marketAngle: String,
    usp: [{ type: String }],
    industry: String,
    competitorInsights: String,
  },

  // ── Agent 2: Strategy ──
  strategy: {
    funnel: [{
      stage: String,
      goal: String,
      kpi: String,
      budgetPercent: Number,
    }],
    platforms: [{ type: String }],
    budgetSplit: {
      awareness: Number,
      consideration: Number,
      conversion: Number,
    },
    duration: Number,
    totalBudgetSuggestion: String,
    kpiTargets: {
      ctr: String,
      cpl: String,
      reach: String,
    },
  },

  // ── Agent 3: Content Generator (🔥 CORE) ──
  content: {
    adCopies: [adCopySchema],
    hooks: [{ type: String }],
    headlines: [{ type: String }],
  },

  // ── Agent 4: Creative Director ──
  creative: {
    imageDescriptions: [{ type: String }],
    videoScripts: [{
      title: String,
      duration: String,
      script: String,
    }],
    reelsIdeas: [{ type: String }],
    carouselSlides: [{
      slideNumber: Number,
      content: String,
      visual: String,
    }],
    colorPalette: [{ type: String }],
    moodDescription: String,
  },

  // ── Agent 5: Optimizer ──
  optimization: {
    abVariants: [{
      original: String,
      variant: String,
      reason: String,
    }],
    targetingTips: [{ type: String }],
    budgetAdvice: String,
    performancePrediction: String,
  },

}, { timestamps: true });

module.exports = mongoose.model('MBCampaign', campaignSchema);
