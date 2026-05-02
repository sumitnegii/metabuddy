const mongoose = require('mongoose');

const metaAdAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', required: true, index: true },
  accountId: { type: String, required: true },
  name: { type: String, default: '' },
  currency: { type: String, default: '' },
  timezoneName: { type: String, default: '' },
  accountStatus: { type: Number },
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: Date,
  metaAccountNameSnapshot: { type: String, default: '' },
  lastInsightsSummary: {
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
  },
  lastSyncedAt: Date,
}, { timestamps: true });

metaAdAccountSchema.index({ userId: 1, accountId: 1, connectionId: 1 }, { unique: true });
metaAdAccountSchema.index({ userId: 1, accountId: 1 });

module.exports = mongoose.model('MBMetaAdsV2AdAccount', metaAdAccountSchema);
