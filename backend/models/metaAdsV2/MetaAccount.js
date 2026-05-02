const mongoose = require('mongoose');

const metaAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  metaUserId: { type: String, default: '', index: true },
  name: { type: String, default: '' },
  accessTokenEncrypted: { type: String, required: true, select: false },
  accessTokenIv: { type: String, required: true, select: false },
  accessTokenTag: { type: String, required: true, select: false },
  tokenLastFour: { type: String, default: '' },
  tokenExpiresAt: Date,
  tokenStatus: { type: String, enum: ['valid', 'expiring_soon', 'expired', 'revoked'], default: 'valid', index: true },
  isValid: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true, index: true },
  deletedAt: Date,
  disconnectedAt: Date,
  disconnectReason: { type: String, default: '' },
  lastErrorAt: Date,
  lastErrorMessage: { type: String, default: '' },
  lastSyncedAt: Date,
  lastSuccessfulSyncAt: Date,
  syncHealthStatus: { type: String, enum: ['healthy', 'warning', 'error', 'unknown'], default: 'unknown', index: true },
}, { timestamps: true });

metaAccountSchema.index({ userId: 1, metaUserId: 1 }, { unique: true });

module.exports = mongoose.model('MBMetaAdsV2Account', metaAccountSchema);
