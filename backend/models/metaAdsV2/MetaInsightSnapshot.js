const mongoose = require('mongoose');

const metaInsightSnapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ['account', 'campaign', 'adset', 'ad'], required: true },
  entityId: { type: String, required: true, index: true },
  datePreset: { type: String, default: 'last_30d' },
  dateStart: String,
  dateStop: String,
  metrics: { type: Object, default: {} },
  raw: { type: Object, default: {} },
}, { timestamps: true });

metaInsightSnapshotSchema.index({ userId: 1, entityType: 1, entityId: 1, datePreset: 1 });

module.exports = mongoose.model('MBMetaAdsV2InsightSnapshot', metaInsightSnapshotSchema);
