const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MBUser', required: true, index: true },
  templateId: { type: String, required: true }, // e.g., 'copywriter-pro'
  name: { type: String, required: true },
  role: { type: String, required: true }, // 'Strategy', 'Creative', 'Copywriting', 'Optimization'
  status: { type: String, enum: ['idle', 'working', 'paused'], default: 'idle' },
  costPerTask: { type: Number, default: 0.10 },
  performanceScore: { type: Number, default: 95 },
  skills: [{ type: String }],
  avatar: { type: String }, // emoji or url
  bio: { type: String },
  model: { type: String, default: 'gemini-1.5-pro' },
  
  // Budgeting & Offers
  budgetAllocated: { type: Number, default: 0 },
  budgetSpent: { type: Number, default: 0 },
  tasksCompleted: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MBAgent', agentSchema);
