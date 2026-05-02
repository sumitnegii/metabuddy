const mongoose = require('mongoose');

const metaCampaignSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', required: true, index: true },
  adAccountId: { type: String, required: true, index: true },
  metaCampaignId: { type: String, required: true },
  name: { type: String, required: true },
  objective: { type: String, default: '' },
  status: { type: String, default: '' },
  effectiveStatus: { type: String, default: '' },
  buyingType: { type: String, default: '' },
  dailyBudget: { type: Number, default: 0 },
  lifetimeBudget: { type: Number, default: 0 },
  startTime: Date,
  stopTime: Date,
  metaCreatedAt: Date,
  metaUpdatedAt: Date,
  sortKey: { type: Date, index: true },
  lastInsightsDate: String,
  lastInsightsSummary: {
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    cpm: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    costPerLead: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
  },
  lastSyncedAt: Date,
  cacheExpiresAt: Date,
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: Date,
  raw: { type: Object, default: {} },
}, { timestamps: true });

metaCampaignSchema.index({ userId: 1, adAccountId: 1, metaCampaignId: 1 }, { unique: true });
metaCampaignSchema.index({ userId: 1, adAccountId: 1, metaUpdatedAt: -1 });

module.exports = mongoose.model('MBMetaAdsV2Campaign', metaCampaignSchema);
