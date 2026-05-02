const mongoose = require('mongoose');

const agentLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaign', index: true },
  agentName: { type: String, required: true }, // e.g., 'IdeaExpansion', 'Strategy', 'Content'
  provider: { type: String, enum: ['claude', 'gemini'], required: true },
  model: { type: String, required: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MBAgentLog', agentLogSchema);
