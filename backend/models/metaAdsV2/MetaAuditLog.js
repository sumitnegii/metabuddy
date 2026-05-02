const mongoose = require('mongoose');

const metaAuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBMetaAdsV2Account', index: true },
  adAccountId: { type: String, default: '', index: true },
  actorType: { type: String, enum: ['user', 'system', 'agent'], default: 'user' },
  eventType: { type: String, required: true, index: true },
  entityType: { type: String, default: '' },
  entityId: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  ipAddress: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('MBMetaAdsV2AuditLog', metaAuditLogSchema);
