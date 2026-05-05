const mongoose = require('mongoose');

const adCreativeMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', index: true },
  prompt: { type: String, default: '' },
  sector: { type: String, default: '' },
  audience: { type: String, default: '' },
  creativeType: { type: String, default: '' },
  adName: { type: String, default: '' },
  adText: { type: String, default: '' },
  headline: { type: String, default: '' },
  cta: { type: String, default: '' },
  score: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  conversion: { type: Number, default: 0 },
  riskScore: { type: Number, default: 0 },
  tokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

adCreativeMemorySchema.index({ userId: 1, createdAt: -1 });
adCreativeMemorySchema.index({ userId: 1, sector: 1, createdAt: -1 });

module.exports = mongoose.model('MBAdCreativeMemory', adCreativeMemorySchema);
