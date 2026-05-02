const mongoose = require('mongoose');

const metaAdSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  metaCampaignId: { type: String, required: true, index: true },
  metaAdSetId: { type: String, default: '', index: true },
  metaAdId: { type: String, required: true },
  creativeId: { type: String, default: '' },
  name: { type: String, required: true },
  status: { type: String, default: '' },
  effectiveStatus: { type: String, default: '' },
  headline: { type: String, default: '' },
  body: { type: String, default: '' },
  callToActionType: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  lastInsights: {
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
  raw: { type: Object, default: {} },
}, { timestamps: true });

metaAdSchema.index({ userId: 1, metaAdId: 1 }, { unique: true });

module.exports = mongoose.model('MBMetaAdsV2Ad', metaAdSchema);
