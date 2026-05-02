const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaign', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  generatedCopyId: { type: String, required: true },
  platform: { type: String, enum: ['meta', 'instagram', 'google', 'other'], default: 'meta' },
  platformAdId: { type: String, default: '' },
  adCopy: { type: String, default: '' },
  headline: { type: String, default: '' },
  hook: { type: String, default: '' },
  cta: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'live', 'paused', 'completed'], default: 'draft' },
  postedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('MBAd', adSchema);
