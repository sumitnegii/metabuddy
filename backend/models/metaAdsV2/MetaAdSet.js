const mongoose = require('mongoose');

const metaAdSetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  metaCampaignId: { type: String, required: true, index: true },
  metaAdSetId: { type: String, required: true },
  name: { type: String, required: true },
  status: { type: String, default: '' },
  effectiveStatus: { type: String, default: '' },
  optimizationGoal: { type: String, default: '' },
  billingEvent: { type: String, default: '' },
  bidStrategy: { type: String, default: '' },
  dailyBudget: { type: Number, default: 0 },
  lifetimeBudget: { type: Number, default: 0 },
  targeting: { type: Object, default: {} },
  lastInsights: {
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    costPerLead: { type: Number, default: 0 },
  },
  lastSyncedAt: Date,
  raw: { type: Object, default: {} },
}, { timestamps: true });

metaAdSetSchema.index({ userId: 1, metaAdSetId: 1 }, { unique: true });

module.exports = mongoose.model('MBMetaAdsV2AdSet', metaAdSetSchema);
