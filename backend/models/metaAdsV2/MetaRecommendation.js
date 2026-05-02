const mongoose = require('mongoose');

const metaRecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['campaign', 'adset', 'ad'], required: true },
  entityId: { type: String, required: true, index: true },
  campaignId: { type: String, default: '', index: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  modelVersion: { type: String, default: '' },
  ruleVersion: { type: String, default: 'meta-ads-rules-v1' },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  confidenceScore: { type: Number, default: 0 },
  category: { type: String, enum: ['creative', 'budget', 'audience', 'delivery', 'tracking', 'structure'], default: 'delivery' },
  suggestedAction: { type: String, enum: ['pause', 'scale_budget', 'reduce_budget', 'edit_copy', 'refresh_creative', 'adjust_audience', 'monitor', 'create_ad'], default: 'monitor' },
  expectedImpact: { type: String, default: '' },
  actionPayload: { type: Object, default: {} },
  status: { type: String, enum: ['pending', 'approved', 'applied', 'rejected', 'failed'], default: 'pending', index: true },
  appliedAt: Date,
  rejectedAt: Date,
  failedAt: Date,
  failureReason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('MBMetaAdsV2Recommendation', metaRecommendationSchema);
