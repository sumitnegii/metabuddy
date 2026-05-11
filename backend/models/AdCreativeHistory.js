const mongoose = require('mongoose');

const adCreativeHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  prompt: { type: String, default: '', index: true },
  platform: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'webapp'], default: 'facebook' },
  selectedVariationId: { type: String, default: '' },
  bestAd: { type: Object, default: null },
  variationCount: { type: Number, default: 0 },
  variations: { type: [mongoose.Schema.Types.Mixed], default: [] },
  intelligence: { type: Object, default: null },
  agents: { type: [mongoose.Schema.Types.Mixed], default: [] },
  audit: { type: mongoose.Schema.Types.Mixed, default: null },
  report: { type: mongoose.Schema.Types.Mixed, default: null },
  mermaid: { type: String, default: '' },
  totals: {
    tokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
  },
  fullResult: { type: Object, default: null },
}, { timestamps: true });

adCreativeHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MBAdCreativeHistory', adCreativeHistorySchema);
