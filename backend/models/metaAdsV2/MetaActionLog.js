const mongoose = require('mongoose');

const metaActionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  recommendationId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Recommendation' },
  actionType: { type: String, required: true },
  entityType: { type: String, enum: ['campaign', 'campaign_draft', 'adset', 'ad'], required: true },
  entityId: { type: String, required: true },
  status: { type: String, enum: ['queued', 'applied', 'failed'], default: 'queued' },
  requestPayload: { type: Object, default: {} },
  responsePayload: { type: Object, default: {} },
  error: { type: String, default: '' },
  appliedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('MBMetaAdsV2ActionLog', metaActionLogSchema);
