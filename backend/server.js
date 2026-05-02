require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');


const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(cors({ origin: true, credentials: true }));

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'marketing-copilot', health: '/api/health' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'marketing-copilot', ts: new Date().toISOString() });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/ads', require('./routes/ads'));
app.use('/api/meta', require('./routes/meta'));
app.use('/api/meta-ads-v2', require('./routes/metaAdsV2'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/campaign-drafts', require('./routes/campaignDrafts'));

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const { trackAndOptimize } = require('./services/AutomatedLoopService');
const { startMetaAdsV2SyncWorker } = require('./services/metaAdsV2Worker');

const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    
    if (process.env.LEGACY_OPTIMIZATION_LOOP_ENABLED === 'true') {
      trackAndOptimize();
      setInterval(trackAndOptimize, 6 * 60 * 60 * 1000);
    }

    if (process.env.META_ADS_V2_WORKER_ENABLED === 'true') {
      startMetaAdsV2SyncWorker();
    }

    app.listen(PORT, () => console.log(`🚀 AI Marketing Copilot API on port ${PORT}`));
  })
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });
