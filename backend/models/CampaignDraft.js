const mongoose = require('mongoose');

const campaignDraftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  title: { type: String, default: 'Untitled campaign' },
  brief: { type: String, required: true },
  selectedAgentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MBAgent' }],
  status: {
    type: String,
    enum: ['draft', 'agents_queued', 'agents_running', 'ready_for_review', 'approved', 'publishing', 'published_paused', 'failed'],
    default: 'draft',
    index: true,
  },
  aiProvider: { type: String, enum: ['claude', 'gemini'], default: 'gemini' },
  automationLevel: {
    type: String,
    enum: ['draft', 'paused_meta', 'autopilot_recommendations'],
    default: 'paused_meta',
  },
  launchConfig: {
    objective: { type: String, default: 'OUTCOME_TRAFFIC' },
    websiteUrl: { type: String, default: '' },
    pageId: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    dailyBudget: { type: Number, default: 0 },
    dailyBudgetMinor: { type: Number, default: 0 },
  },
  outputs: {
    ideaExpansion: { type: Object, default: null },
    strategy: { type: Object, default: null },
    content: { type: Object, default: null },
    creative: { type: Object, default: null },
    optimization: { type: Object, default: null },
  },
  meta: {
    campaignId: { type: String, default: '' },
    adSetId: { type: String, default: '' },
    creativeId: { type: String, default: '' },
    adId: { type: String, default: '' },
    status: { type: String, default: '' },
    publishedAt: Date,
  },
  failureReason: { type: String, default: '' },
}, { timestamps: true });

campaignDraftSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MBCampaignDraft', campaignDraftSchema);
