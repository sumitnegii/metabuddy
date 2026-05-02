const { processNextSyncJob } = require('./metaAdsV2Service');

function startMetaAdsV2SyncWorker(options = {}) {
  const intervalMs = Number(options.intervalMs || process.env.META_ADS_V2_WORKER_INTERVAL_MS || 60_000);
  const workerId = options.workerId || process.env.META_ADS_V2_WORKER_ID || `${process.env.HOSTNAME || 'api'}-${process.pid}`;
  let running = false;

  async function tick() {
    if (running) return;
    running = true;
    try {
      const result = await processNextSyncJob(workerId);
      if (result.processed) {
        console.log(`[meta-ads-v2-worker] processed sync job ${result.jobId}`);
      }
    } catch (err) {
      console.error('[meta-ads-v2-worker] sync job failed:', err.message);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(tick, intervalMs);
  tick();

  return {
    workerId,
    stop: () => clearInterval(timer),
  };
}

module.exports = { startMetaAdsV2SyncWorker };
