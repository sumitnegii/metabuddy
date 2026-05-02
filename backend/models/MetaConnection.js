const mongoose = require('mongoose');

const metaConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  accessToken: { type: String, required: true },
  adAccountId: { type: String, required: true },
  adAccountName: { type: String, default: '' },
  isValid: { type: Boolean, default: true },
  tokenExpiresAt: Date,
  lastVerifiedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('MBMetaConnection', metaConnectionSchema);
