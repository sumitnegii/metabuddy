const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  spend: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  purchaseValue: { type: Number, default: 0 },
}, { _id: false });

const metaDailyInsightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', required: true, index: true },
  adAccountId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['account', 'campaign', 'adset', 'ad'], required: true, index: true },
  entityId: { type: String, required: true, index: true },
  date: { type: String, required: true, index: true },
  metrics: { type: metricSchema, default: () => ({}) },
  source: { type: String, enum: ['meta'], default: 'meta' },
}, { timestamps: true });

metaDailyInsightSchema.index(
  { userId: 1, connectionId: 1, adAccountId: 1, entityType: 1, entityId: 1, date: 1 },
  { unique: true }
);
metaDailyInsightSchema.index({ userId: 1, connectionId: 1, adAccountId: 1, date: -1 });

module.exports = mongoose.model('MBMetaAdsV2DailyInsight', metaDailyInsightSchema);
