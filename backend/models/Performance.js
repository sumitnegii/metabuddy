const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  adId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBAd', required: true, index: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBCampaign', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  platform: { type: String, required: true, index: true },
  externalId: { type: String, required: true, index: true },
  impressions: { type: Number, default: 0 },
  reach: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  cpl: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('MBPerformance', performanceSchema);
