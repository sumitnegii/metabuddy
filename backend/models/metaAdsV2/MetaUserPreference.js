const mongoose = require('mongoose');

const metaUserPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true },
  selectedConnectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account' },
  selectedAdAccountId: { type: String, default: '' },
  dashboardDatePreset: { type: String, default: 'last_30d' },
}, { timestamps: true });

metaUserPreferenceSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('MBMetaAdsV2UserPreference', metaUserPreferenceSchema);
