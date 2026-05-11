const mongoose = require('mongoose');

const adCreativePreviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  variationId: { type: String, default: '', index: true },
  prompt: { type: String, default: '' },
  platform: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'webapp'], default: 'facebook' },
  rank: { type: Number, default: 1 },
  currency: { type: String, default: 'INR' },
  cpm: { type: Number, default: 100 },
  variation: { type: Object, required: true },
  forecast: { type: Object, default: null },
  status: {
    type: String,
    enum: ['draft', 'publishing', 'published_paused', 'failed'],
    default: 'draft',
    index: true,
  },
  launchConfig: {
    objective: { type: String, default: 'OUTCOME_SALES' },
    websiteUrl: { type: String, default: '' },
    pageId: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    imageHash: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    dailyBudget: { type: Number, default: 500 },
    dailyBudgetMinor: { type: Number, default: 0 },
  },
  meta: {
    campaignId: { type: String, default: '' },
    adSetId: { type: String, default: '' },
    creativeId: { type: String, default: '' },
    adId: { type: String, default: '' },
    status: { type: String, default: '' },
    publishedAt: Date,
    raw: { type: Object, default: null },
  },
  failureReason: { type: String, default: '' },
}, { timestamps: true });

adCreativePreviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MBAdCreativePreview', adCreativePreviewSchema);
