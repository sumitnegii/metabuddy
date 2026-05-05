const mongoose = require('mongoose');

const mcpCostLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', index: true },
  agent: { type: String, required: true, index: true },
  tokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  requestId: { type: String, default: '', index: true },
  source: { type: String, default: 'ad-creative-pipeline' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

mcpCostLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MBMcpCostLog', mcpCostLogSchema);
