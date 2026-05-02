const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, company });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: user.toSafe() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: user.toSafe() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafe() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Complete onboarding
router.put('/onboarding', auth, async (req, res) => {
  try {
    const { company, country, industry, goals } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { company, country, industry, goals, onboardingCompleted: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafe() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
