const mongoose = require('mongoose');

const metaSyncJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, required: true, index: true },
  idempotencyKey: { type: String, required: true, index: true },
  jobType: { type: String, enum: ['manual', 'scheduled'], default: 'manual', index: true },
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued', index: true },
  datePreset: { type: String, default: 'last_30d' },
  dateStart: String,
  dateStop: String,
  startedAt: Date,
  finishedAt: Date,
  lockedAt: Date,
  lockedBy: { type: String, default: '' },
  retryCount: { type: Number, default: 0 },
  nextRetryAt: Date,
  rateLimitRemaining: Number,
  rateLimitResetAt: Date,
  counts: {
    campaigns: { type: Number, default: 0 },
    adSets: { type: Number, default: 0 },
    ads: { type: Number, default: 0 },
    insights: { type: Number, default: 0 },
  },
  error: { type: String, default: '' },
}, { timestamps: true });

metaSyncJobSchema.index({ userId: 1, adAccountId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model('MBMetaAdsV2SyncJob', metaSyncJobSchema);
