const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  company: { type: String, trim: true },
  role: { type: String, enum: ['admin', 'marketer', 'viewer'], default: 'marketer' },
  
  // Onboarding
  onboardingCompleted: { type: Boolean, default: false },
  country: { type: String, trim: true },
  industry: [{ type: String }],
  goals: [{ type: String }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafe = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('MBUser', userSchema);
