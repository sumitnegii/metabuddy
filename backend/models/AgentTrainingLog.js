const mongoose = require('mongoose');

const agentTrainingLogSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaign', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  modelProvider: { type: String, required: true }, // e.g., 'gemini' or 'claude'
  modelName: { type: String, required: true },
  trainingStatus: { type: String, enum: ['queued', 'in_progress', 'completed', 'failed'], default: 'queued' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('AgentTrainingLog', agentTrainingLogSchema);
