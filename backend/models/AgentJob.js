const mongoose = require('mongoose');

const agentJobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaignDraft', required: true, index: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBAgent', index: true },
  agentRole: { type: String, required: true },
  jobType: {
    type: String,
    enum: ['idea', 'strategy', 'content', 'creative', 'optimization'],
    required: true,
  },
  status: {
    type: String,
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued',
    index: true,
  },
  input: { type: Object, default: {} },
  output: { type: Object, default: {} },
  error: { type: String, default: '' },
  startedAt: Date,
  finishedAt: Date,
}, { timestamps: true });

agentJobSchema.index({ userId: 1, draftId: 1, jobType: 1 });

module.exports = mongoose.model('MBAgentJob', agentJobSchema);
