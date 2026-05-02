const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaignDraft', required: true, index: true },
  type: {
    type: String,
    enum: ['campaign_publish', 'agent_action'],
    default: 'campaign_publish',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'applied', 'failed'],
    default: 'pending',
    index: true,
  },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  payload: { type: Object, default: {} },
  approvedAt: Date,
  rejectedAt: Date,
  appliedAt: Date,
  failureReason: { type: String, default: '' },
}, { timestamps: true });

approvalRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('MBApprovalRequest', approvalRequestSchema);
