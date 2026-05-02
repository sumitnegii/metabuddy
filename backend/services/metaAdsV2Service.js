const jwt = require('jsonwebtoken');
const MetaAccount = require('../models/metaAdsV2/MetaAccount');
const MetaAdAccount = require('../models/metaAdsV2/MetaAdAccount');
const MetaCampaign = require('../models/metaAdsV2/MetaCampaign');
const MetaAdSet = require('../models/metaAdsV2/MetaAdSet');
const MetaAd = require('../models/metaAdsV2/MetaAd');
const MetaInsightSnapshot = require('../models/metaAdsV2/MetaInsightSnapshot');
const MetaDailyInsight = require('../models/metaAdsV2/MetaDailyInsight');
const MetaSyncJob = require('../models/metaAdsV2/MetaSyncJob');
const MetaAuditLog = require('../models/metaAdsV2/MetaAuditLog');
const MetaUserPreference = require('../models/metaAdsV2/MetaUserPreference');
const MetaRecommendation = require('../models/metaAdsV2/MetaRecommendation');
const MetaActionLog = require('../models/metaAdsV2/MetaActionLog');
const { encryptMetaToken, decryptMetaToken } = require('./tokenCrypto');
const Campaign = require('../models/Campaign');
const CampaignDraft = require('../models/CampaignDraft');
const ApprovalRequest = require('../models/ApprovalRequest');
const { generateJSON } = require('./agents/llmProvider');
const { extractJSON } = require('./agents/jsonExtractor');

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const SCOPES = [
  'ads_read',
  'ads_management',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
];

class MetaApiError extends Error {
  constructor(message, metaError = {}, statusCode = 500) {
    super(message);
    this.name = 'MetaApiError';
    this.statusCode = statusCode;
    this.metaError = metaError;
  }
}

function ensureMetaConfig() {
  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET || !process.env.JWT_SECRET) {
    throw new Error('META_APP_ID, META_APP_SECRET, and JWT_SECRET are required for Meta Ads v2');
  }
}

function normalizeActId(accountId) {
  if (!accountId) return '';
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`;
}

function buildOAuthUrl(userId) {
  ensureMetaConfig();
  const redirectUri = `${BACKEND_URL}/api/meta-ads-v2/oauth/callback`;
  const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    scope: SCOPES.join(','),
    state,
    response_type: 'code',
  });

  return `https://www.facebook.com/${META_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphGet(path, accessToken, params = {}) {
  const url = new URL(`${BASE_URL}/${path.replace(/^\//, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  if (accessToken) url.searchParams.set('access_token', accessToken);

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new MetaApiError(data.error?.error_user_msg || data.error?.message || `Meta request failed: ${res.status}`, data.error, res.status);
  }
  return data;
}

async function graphPost(path, accessToken, body = {}) {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
  params.set('access_token', accessToken);

  const res = await fetch(`${BASE_URL}/${path.replace(/^\//, '')}`, {
    method: 'POST',
    body: params,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new MetaApiError(data.error?.error_user_msg || data.error?.message || `Meta update failed: ${res.status}`, data.error, res.status);
  }
  return data;
}

async function fetchAll(path, accessToken, params = {}, limit = 100) {
  const first = await graphGet(path, accessToken, { ...params, limit });
  const items = [...(first.data || [])];
  let next = first.paging?.next;

  while (next) {
    const res = await fetch(next);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `Meta paging failed: ${res.status}`);
    items.push(...(data.data || []));
    next = data.paging?.next;
  }

  return items;
}

function numberValue(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionCount(actions = [], names = []) {
  return actions
    .filter((action) => names.includes(action.action_type))
    .reduce((sum, action) => sum + numberValue(action.value), 0);
}

function roasValue(actionValues = []) {
  const purchase = actionValues.find((action) => action.action_type === 'purchase' || action.action_type === 'omni_purchase');
  return numberValue(purchase?.value);
}

function purchaseValue(actionValues = []) {
  return actionValues
    .filter((action) => action.action_type === 'purchase' || action.action_type === 'omni_purchase')
    .reduce((sum, action) => sum + numberValue(action.value), 0);
}

function normalizeInsights(raw = {}) {
  const leads = actionCount(raw.actions, ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead']);
  const purchases = actionCount(raw.actions, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  const spend = numberValue(raw.spend);
  return {
    spend,
    impressions: numberValue(raw.impressions),
    reach: numberValue(raw.reach),
    clicks: numberValue(raw.clicks),
    ctr: numberValue(raw.ctr),
    cpc: numberValue(raw.cpc),
    cpm: numberValue(raw.cpm),
    conversions: leads + purchases,
    leads,
    purchases,
    purchaseValue: purchaseValue(raw.action_values),
    costPerLead: leads > 0 ? spend / leads : 0,
    roas: roasValue(raw.action_values),
  };
}

function normalizeWebsiteUrl(value) {
  const candidate = /^https?:\/\//i.test(String(value || '').trim())
    ? String(value || '').trim()
    : `https://${String(value || '').trim()}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) {
      throw new Error('Website URL must be a real public URL, for example https://example.com');
    }
    return url.toString();
  } catch (err) {
    throw new Error('Website URL must be a real public URL, for example https://example.com');
  }
}

function textLimit(value, max, fallback = '') {
  const cleaned = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? cleaned.slice(0, max - 1).trimEnd() : cleaned;
}

function rawInsightMetrics(metrics = {}) {
  return {
    spend: metrics.spend || 0,
    impressions: metrics.impressions || 0,
    reach: metrics.reach || 0,
    clicks: metrics.clicks || 0,
    conversions: metrics.conversions || 0,
    leads: metrics.leads || 0,
    purchases: metrics.purchases || 0,
    purchaseValue: metrics.purchaseValue || 0,
  };
}

function addToAccountSummary(acc, metrics = {}) {
  acc.spend += metrics.spend || 0;
  acc.impressions += metrics.impressions || 0;
  acc.clicks += metrics.clicks || 0;
  acc.leads += metrics.leads || 0;
  acc.purchases += metrics.purchases || 0;
  return acc;
}

async function logAudit(userId, eventType, metadata = {}) {
  return MetaAuditLog.create({
    userId,
    connectionId: metadata.connectionId,
    adAccountId: metadata.adAccountId || '',
    actorType: metadata.actorType || 'system',
    eventType,
    entityType: metadata.entityType || '',
    entityId: metadata.entityId || '',
    metadata,
    ipAddress: metadata.ipAddress || '',
  }).catch((err) => console.error('Meta audit log failed:', err.message));
}

async function upsertDailyInsight({ userId, connectionId, adAccountId, entityType, entityId, raw, metrics }) {
  const date = raw.date_start || new Date().toISOString().slice(0, 10);
  await MetaDailyInsight.findOneAndUpdate(
    { userId, connectionId, adAccountId, entityType, entityId, date },
    { metrics: rawInsightMetrics(metrics), source: 'meta' },
    { upsert: true, new: true }
  );
}

async function getPreference(userId) {
  return MetaUserPreference.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true }
  );
}

async function exchangeCodeForToken(code) {
  ensureMetaConfig();
  const redirectUri = `${BACKEND_URL}/api/meta-ads-v2/oauth/callback`;
  const tokenData = await graphGet('/oauth/access_token', '', {
    client_id: process.env.META_APP_ID,
    redirect_uri: redirectUri,
    client_secret: process.env.META_APP_SECRET,
    code,
  });

  const longData = await graphGet('/oauth/access_token', '', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: tokenData.access_token,
  });

  return {
    accessToken: longData.access_token || tokenData.access_token,
    expiresIn: longData.expires_in || tokenData.expires_in || 5184000,
  };
}

async function saveConnectionFromOAuth(userId, code) {
  const { accessToken, expiresIn } = await exchangeCodeForToken(code);
  const profile = await graphGet('/me', accessToken, { fields: 'id,name' });

  const account = await MetaAccount.findOneAndUpdate(
    { userId, metaUserId: profile.id },
    {
      $set: {
        metaUserId: profile.id,
        name: profile.name || '',
        ...encryptMetaToken(accessToken),
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        tokenStatus: 'valid',
        isValid: true,
        isActive: true,
        disconnectReason: '',
      },
      $unset: {
        deletedAt: '',
        disconnectedAt: '',
        lastErrorAt: '',
      },
    },
    { upsert: true, new: true }
  );

  account.accessToken = accessToken;
  let adAccountSync = { success: true, count: 0, error: '' };
  try {
    const adAccounts = await syncAdAccounts(userId, account);
    adAccountSync.count = adAccounts.length;
    account.syncHealthStatus = 'healthy';
    account.lastErrorMessage = '';
    await account.save();
  } catch (err) {
    adAccountSync = { success: false, count: 0, error: err.message };
    account.syncHealthStatus = 'warning';
    account.lastErrorAt = new Date();
    account.lastErrorMessage = err.message;
    await account.save();
  }

  await logAudit(userId, 'meta_connected', {
    connectionId: account._id,
    actorType: 'user',
    metaUserId: profile.id,
    adAccountSync,
  });
  account.adAccountSync = adAccountSync;
  return account;
}

async function getConnection(userId, connectionId) {
  const query = { userId, isValid: true, isActive: true };
  if (connectionId) query._id = connectionId;
  const account = await MetaAccount.findOne(query).select('+accessTokenEncrypted +accessTokenIv +accessTokenTag');
  if (!account) throw new Error('No connected Meta account');
  const now = Date.now();
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= now) {
    account.tokenStatus = 'expired';
    account.isValid = false;
    await account.save();
    throw new Error('Meta token expired. Please reconnect Meta.');
  }
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now < 7 * 24 * 60 * 60 * 1000 && account.tokenStatus !== 'expiring_soon') {
    account.tokenStatus = 'expiring_soon';
    await account.save();
  }
  account.accessToken = decryptMetaToken(account);
  return account;
}

function permissionStatusMap(permissions = []) {
  return permissions.reduce((acc, permission) => {
    acc[permission.permission] = permission.status;
    return acc;
  }, {});
}

async function diagnoseMetaConnection(userId, options = {}) {
  let account;
  try {
    account = await getConnection(userId, options.connectionId);
  } catch (err) {
    const connections = await MetaAccount.find({ userId, isActive: true }).sort({ createdAt: -1 });
    return {
      ok: false,
      connected: false,
      error: err.message,
      apiVersion: META_API_VERSION,
      callbackUrl: `${BACKEND_URL}/api/meta-ads-v2/oauth/callback`,
      frontendUrl: FRONTEND_URL,
      requiredScopes: SCOPES,
      connectionCount: connections.length,
      connections: connections.map((connection) => ({
        id: connection._id,
        metaUserId: connection.metaUserId,
        name: connection.name || '',
        tokenStatus: connection.tokenStatus,
        isValid: connection.isValid,
        syncHealthStatus: connection.syncHealthStatus,
        lastErrorMessage: connection.lastErrorMessage || '',
        createdAt: connection.createdAt,
      })),
      hint: connections.length
        ? 'A Meta connection exists for this MetaBuddy user but its token cannot be used. Reconnect Meta after confirming META_TOKEN_ENCRYPTION_KEY is stable.'
        : 'No Meta connection exists for this MetaBuddy user. Click Connect Meta while logged in as this same MetaBuddy user.',
    };
  }
  const [profile, permissionsRaw, adAccountsRaw, pagesRaw] = await Promise.allSettled([
    graphGet('/me', account.accessToken, { fields: 'id,name' }),
    graphGet('/me/permissions', account.accessToken),
    graphGet('/me/adaccounts', account.accessToken, {
      fields: 'id,name,account_status,currency,timezone_name,user_tasks',
      limit: 25,
    }),
    graphGet('/me/accounts', account.accessToken, {
      fields: 'id,name,tasks,access_token',
      limit: 25,
    }),
  ]);

  const permissions = permissionsRaw.status === 'fulfilled' ? permissionsRaw.value.data || [] : [];
  const permissionMap = permissionStatusMap(permissions);
  const requiredScopes = SCOPES;
  const missingScopes = requiredScopes.filter((scope) => permissionMap[scope] !== 'granted');
  const selectedAdAccount = await getSelectedAdAccount(userId).catch(() => null);

  const pages = pagesRaw.status === 'fulfilled'
    ? (pagesRaw.value.data || []).map((page) => ({
      id: page.id,
      name: page.name,
      tasks: page.tasks || [],
      canAdvertise: (page.tasks || []).some((task) => ['ADVERTISE', 'CREATE_CONTENT', 'MANAGE'].includes(task)),
    }))
    : [];

  const adAccounts = adAccountsRaw.status === 'fulfilled'
    ? (adAccountsRaw.value.data || []).map((adAccount) => ({
      id: adAccount.id,
      name: adAccount.name || '',
      accountStatus: adAccount.account_status,
      currency: adAccount.currency || '',
      timezoneName: adAccount.timezone_name || '',
      userTasks: adAccount.user_tasks || [],
      isSelected: selectedAdAccount?.accountId === adAccount.id,
      canManageAds: (adAccount.user_tasks || []).some((task) => ['ADVERTISE', 'MANAGE', 'ANALYZE'].includes(task)),
    }))
    : [];

  const diagnostics = {
    ok: missingScopes.length === 0 && adAccounts.length > 0,
    connected: true,
    apiVersion: META_API_VERSION,
    callbackUrl: `${BACKEND_URL}/api/meta-ads-v2/oauth/callback`,
    frontendUrl: FRONTEND_URL,
    appModeHint: 'For public users, the Meta app must be Live and advanced access/app review must be approved for requested permissions.',
    profile: profile.status === 'fulfilled' ? profile.value : null,
    token: {
      status: account.tokenStatus,
      expiresAt: account.tokenExpiresAt,
    },
    requiredScopes,
    permissions,
    missingScopes,
    adAccounts,
    pages,
    selectedAdAccount: selectedAdAccount
      ? {
        accountId: selectedAdAccount.accountId,
        name: selectedAdAccount.name || '',
        accountStatus: selectedAdAccount.accountStatus,
      }
      : null,
    failures: {
      profile: profile.status === 'rejected' ? profile.reason.message : '',
      permissions: permissionsRaw.status === 'rejected' ? permissionsRaw.reason.message : '',
      adAccounts: adAccountsRaw.status === 'rejected' ? adAccountsRaw.reason.message : '',
      pages: pagesRaw.status === 'rejected' ? pagesRaw.reason.message : '',
    },
  };

  await logAudit(userId, 'meta_connection_diagnosed', {
    connectionId: account._id,
    actorType: 'user',
    missingScopes,
    adAccountCount: adAccounts.length,
    pageCount: pages.length,
  });

  return diagnostics;
}

async function syncAdAccounts(userId, existingConnection) {
  const account = existingConnection || await getConnection(userId);
  if (!account.accessToken) account.accessToken = decryptMetaToken(account);
  const accounts = await fetchAll('/me/adaccounts', account.accessToken, {
    fields: 'id,name,currency,timezone_name,account_status',
  });

  const saved = [];
  for (const adAccount of accounts) {
    const doc = await MetaAdAccount.findOneAndUpdate(
      { userId, accountId: adAccount.id, connectionId: account._id },
      {
        connectionId: account._id,
        accountId: adAccount.id,
        name: adAccount.name || '',
        currency: adAccount.currency || '',
        timezoneName: adAccount.timezone_name || '',
        accountStatus: adAccount.account_status,
        isActive: true,
        deletedAt: undefined,
        metaAccountNameSnapshot: account.name || '',
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    saved.push(doc);
  }

  const preference = await getPreference(userId);
  if (!preference.selectedAdAccountId && saved[0]) {
    preference.selectedConnectionId = account._id;
    preference.selectedAdAccountId = saved[0].accountId;
    await preference.save();
  }

  return saved;
}

async function getSelectedAdAccount(userId) {
  const preference = await getPreference(userId);
  let adAccount = preference.selectedAdAccountId
    ? await MetaAdAccount.findOne({
      userId,
      accountId: preference.selectedAdAccountId,
      ...(preference.selectedConnectionId ? { connectionId: preference.selectedConnectionId } : {}),
      isActive: true,
    })
    : null;

  if (!adAccount) {
    const accounts = await syncAdAccounts(userId);
    adAccount = accounts[0];
  }
  if (!adAccount) throw new Error('No Meta ad account found');
  return adAccount;
}

async function selectAdAccount(userId, accountId, connectionId) {
  const adAccount = await MetaAdAccount.findOne({
    userId,
    accountId,
    ...(connectionId ? { connectionId } : {}),
    isActive: true,
  });
  if (!adAccount) throw new Error('Meta ad account not found');
  await MetaUserPreference.findOneAndUpdate(
    { userId },
    { selectedConnectionId: adAccount.connectionId, selectedAdAccountId: adAccount.accountId },
    { upsert: true, new: true }
  );
  return adAccount;
}

function buildSyncIdempotencyKey(userId, adAccountId, datePreset, jobType) {
  const window = new Date().toISOString().slice(0, 10);
  return `${userId}:${adAccountId}:${datePreset}:${jobType || 'manual'}:${window}`;
}

function publicConnection(account) {
  if (!account) return null;
  const obj = account.toObject ? account.toObject() : account;
  delete obj.accessTokenEncrypted;
  delete obj.accessTokenIv;
  delete obj.accessTokenTag;
  return obj;
}

async function listConnections(userId) {
  const [connections, preference] = await Promise.all([
    MetaAccount.find({ userId, isActive: true }).sort({ createdAt: -1 }),
    getPreference(userId),
  ]);
  return { connections: connections.map(publicConnection), preference };
}

async function disconnectConnection(userId, connectionId, reason = 'user_disconnected') {
  const connection = await MetaAccount.findOneAndUpdate(
    { _id: connectionId, userId },
    {
      isActive: false,
      isValid: false,
      tokenStatus: 'revoked',
      disconnectedAt: new Date(),
      disconnectReason: reason,
    },
    { new: true }
  );
  if (!connection) throw new Error('Meta connection not found');

  await MetaAdAccount.updateMany(
    { userId, connectionId },
    { isActive: false, deletedAt: new Date() }
  );

  const preference = await getPreference(userId);
  if (String(preference.selectedConnectionId || '') === String(connectionId)) {
    const replacement = await MetaAdAccount.findOne({ userId, isActive: true }).sort({ name: 1 });
    preference.selectedConnectionId = replacement?.connectionId;
    preference.selectedAdAccountId = replacement?.accountId || '';
    await preference.save();
  }

  await logAudit(userId, 'meta_disconnected', { connectionId, actorType: 'user', reason });
  return publicConnection(connection);
}

async function listAdAccounts(userId) {
  const [adAccounts, preference] = await Promise.all([
    MetaAdAccount.find({ userId, isActive: true }).sort({ name: 1 }),
    getPreference(userId),
  ]);
  return { adAccounts, preference };
}

async function updatePreference(userId, updates = {}) {
  const patch = {};
  if (updates.dashboardDatePreset) patch.dashboardDatePreset = updates.dashboardDatePreset;
  if (updates.selectedAdAccountId) {
    const adAccount = await selectAdAccount(userId, updates.selectedAdAccountId, updates.selectedConnectionId);
    patch.selectedConnectionId = adAccount.connectionId;
    patch.selectedAdAccountId = adAccount.accountId;
  }

  return MetaUserPreference.findOneAndUpdate(
    { userId },
    patch,
    { upsert: true, new: true }
  );
}

async function enqueueSyncJob(userId, options = {}) {
  const datePreset = options.datePreset || 'last_30d';
  const adAccount = options.accountId
    ? await selectAdAccount(userId, options.accountId, options.connectionId)
    : await getSelectedAdAccount(userId);
  const jobType = options.jobType || 'manual';
  const idempotencyKey = options.idempotencyKey || buildSyncIdempotencyKey(userId, adAccount.accountId, datePreset, jobType);

  const job = await MetaSyncJob.findOneAndUpdate(
    { userId, adAccountId: adAccount.accountId, idempotencyKey },
    {
      $setOnInsert: {
        userId,
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        idempotencyKey,
        jobType,
        datePreset,
        dateStart: options.dateStart,
        dateStop: options.dateStop,
      },
      $set: {
        status: 'queued',
        error: '',
        nextRetryAt: options.nextRetryAt,
      },
    },
    { upsert: true, new: true }
  );

  await logAudit(userId, 'meta_sync_queued', {
    connectionId: adAccount.connectionId,
    adAccountId: adAccount.accountId,
    actorType: jobType === 'scheduled' ? 'system' : 'user',
    jobId: job._id,
  });

  return job;
}

async function claimSyncJob(workerId = process.env.HOSTNAME || `worker-${process.pid}`, userId) {
  const now = new Date();
  const query = {
    status: { $in: ['queued', 'failed'] },
    $and: [
      {
        $or: [
          { nextRetryAt: { $exists: false } },
          { nextRetryAt: null },
          { nextRetryAt: { $lte: now } },
        ],
      },
      {
        $or: [
          { lockedAt: { $exists: false } },
          { lockedAt: null },
          { lockedAt: { $lte: new Date(Date.now() - 15 * 60 * 1000) } },
        ],
      },
    ],
  };
  if (userId) query.userId = userId;

  return MetaSyncJob.findOneAndUpdate(
    query,
    {
      status: 'running',
      lockedAt: now,
      lockedBy: workerId,
      startedAt: now,
      error: '',
    },
    { sort: { createdAt: 1 }, new: true }
  );
}

async function listSyncJobs(userId, limit = 25) {
  return MetaSyncJob.find({ userId }).sort({ createdAt: -1 }).limit(Math.min(Number(limit) || 25, 100));
}

async function runClaimedSyncJob(job) {
  if (!job) return null;
  return syncCampaigns(job.userId, {
    accountId: job.adAccountId,
    datePreset: job.datePreset,
    jobType: job.jobType,
    idempotencyKey: job.idempotencyKey,
    retry: job.retryCount > 0,
    workerId: job.lockedBy || process.env.HOSTNAME || `worker-${process.pid}`,
  });
}

async function processNextSyncJob(workerId, userId) {
  const job = await claimSyncJob(workerId, userId);
  if (!job) return { processed: false };
  const result = await runClaimedSyncJob(job);
  return { processed: true, jobId: job._id, result };
}

async function fetchInsightForEntity(entityId, accessToken, datePreset = 'last_30d') {
  const fields = 'spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values,date_start,date_stop';
  const data = await graphGet(`/${entityId}/insights`, accessToken, { fields, date_preset: datePreset });
  return data.data?.[0] || {};
}

function dateOrUndefined(value) {
  return value ? new Date(value) : undefined;
}

async function syncCampaigns(userId, options = {}) {
  const datePreset = options.datePreset || 'last_30d';
  const adAccount = options.accountId
    ? await selectAdAccount(userId, options.accountId, options.connectionId)
    : await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);

  const accountId = normalizeActId(adAccount.accountId);
  const jobType = options.jobType || 'manual';
  const idempotencyKey = options.idempotencyKey || buildSyncIdempotencyKey(userId, adAccount.accountId, datePreset, jobType);
  let syncJob = await MetaSyncJob.findOneAndUpdate(
    { userId, adAccountId: adAccount.accountId, idempotencyKey },
    {
      $setOnInsert: {
        userId,
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        idempotencyKey,
        jobType,
        datePreset,
      },
      $set: {
        status: 'running',
        startedAt: new Date(),
        lockedAt: new Date(),
        lockedBy: options.workerId || process.env.HOSTNAME || 'api',
        error: '',
      },
      $inc: { retryCount: options.retry ? 1 : 0 },
    },
    { upsert: true, new: true }
  );

  const campaignFields = 'id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time';
  try {
    const campaigns = await fetchAll(`/${accountId}/campaigns`, account.accessToken, { fields: campaignFields });

    let campaignCount = 0;
    let adSetCount = 0;
    let adCount = 0;
    let insightCount = 0;
    const accountInsightsSummary = { spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0 };

    for (const campaign of campaigns) {
    const campaignInsightRaw = await fetchInsightForEntity(campaign.id, account.accessToken, datePreset).catch(() => ({}));
    const campaignInsights = normalizeInsights(campaignInsightRaw);
    addToAccountSummary(accountInsightsSummary, campaignInsights);
    await MetaCampaign.findOneAndUpdate(
      { userId, adAccountId: adAccount.accountId, metaCampaignId: campaign.id },
      {
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        metaCampaignId: campaign.id,
        name: campaign.name,
        objective: campaign.objective || '',
        status: campaign.status || '',
        effectiveStatus: campaign.effective_status || '',
        buyingType: campaign.buying_type || '',
        dailyBudget: numberValue(campaign.daily_budget) / 100,
        lifetimeBudget: numberValue(campaign.lifetime_budget) / 100,
        startTime: dateOrUndefined(campaign.start_time),
        stopTime: dateOrUndefined(campaign.stop_time),
        metaCreatedAt: dateOrUndefined(campaign.created_time),
        metaUpdatedAt: dateOrUndefined(campaign.updated_time),
        sortKey: dateOrUndefined(campaign.updated_time) || new Date(),
        lastInsightsDate: campaignInsightRaw.date_stop || campaignInsightRaw.date_start || '',
        lastInsightsSummary: campaignInsights,
        lastSyncedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isActive: true,
        deletedAt: undefined,
      raw: campaign,
      },
      { upsert: true, new: true }
    );
    await upsertDailyInsight({
      userId,
      connectionId: adAccount.connectionId,
      adAccountId: adAccount.accountId,
      entityType: 'campaign',
      entityId: campaign.id,
      raw: campaignInsightRaw,
      metrics: campaignInsights,
    });
    await MetaInsightSnapshot.create({
      userId,
      connectionId: adAccount.connectionId,
      adAccountId: adAccount.accountId,
      entityType: 'campaign',
      entityId: campaign.id,
      datePreset,
      dateStart: campaignInsightRaw.date_start,
      dateStop: campaignInsightRaw.date_stop,
      metrics: campaignInsights,
      raw: campaignInsightRaw,
    });
    insightCount += 1;
    campaignCount += 1;

    const adSets = await fetchAll(`/${campaign.id}/adsets`, account.accessToken, {
      fields: 'id,name,status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,targeting',
    }).catch(() => []);

    for (const adSet of adSets) {
      const adSetInsightRaw = await fetchInsightForEntity(adSet.id, account.accessToken, datePreset).catch(() => ({}));
      const adSetInsights = normalizeInsights(adSetInsightRaw);
      await MetaAdSet.findOneAndUpdate(
        { userId, metaAdSetId: adSet.id },
        {
          connectionId: adAccount.connectionId,
          adAccountId: adAccount.accountId,
          metaCampaignId: campaign.id,
          metaAdSetId: adSet.id,
          name: adSet.name,
          status: adSet.status || '',
          effectiveStatus: adSet.effective_status || '',
          optimizationGoal: adSet.optimization_goal || '',
          billingEvent: adSet.billing_event || '',
          bidStrategy: adSet.bid_strategy || '',
          dailyBudget: numberValue(adSet.daily_budget) / 100,
          lifetimeBudget: numberValue(adSet.lifetime_budget) / 100,
          targeting: adSet.targeting || {},
          lastInsights: adSetInsights,
          lastSyncedAt: new Date(),
          raw: adSet,
        },
        { upsert: true, new: true }
      );
      await upsertDailyInsight({
        userId,
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        entityType: 'adset',
        entityId: adSet.id,
        raw: adSetInsightRaw,
        metrics: adSetInsights,
      });
      adSetCount += 1;
      insightCount += 1;
    }

    const ads = await fetchAll(`/${campaign.id}/ads`, account.accessToken, {
      fields: 'id,name,status,effective_status,adset_id,creative{id,name,object_story_spec,thumbnail_url}',
    }).catch(() => []);

    for (const ad of ads) {
      const story = ad.creative?.object_story_spec?.link_data || ad.creative?.object_story_spec?.video_data || {};
      const adInsightRaw = await fetchInsightForEntity(ad.id, account.accessToken, datePreset).catch(() => ({}));
      const adInsights = normalizeInsights(adInsightRaw);
      await MetaAd.findOneAndUpdate(
        { userId, metaAdId: ad.id },
        {
          connectionId: adAccount.connectionId,
          adAccountId: adAccount.accountId,
          metaCampaignId: campaign.id,
          metaAdSetId: ad.adset_id || '',
          metaAdId: ad.id,
          creativeId: ad.creative?.id || '',
          name: ad.name,
          status: ad.status || '',
          effectiveStatus: ad.effective_status || '',
          headline: story.name || story.title || '',
          body: story.message || '',
          callToActionType: story.call_to_action?.type || '',
          imageUrl: story.picture || ad.creative?.thumbnail_url || '',
          lastInsights: adInsights,
          lastSyncedAt: new Date(),
          raw: ad,
        },
        { upsert: true, new: true }
      );
      await upsertDailyInsight({
        userId,
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        entityType: 'ad',
        entityId: ad.id,
        raw: adInsightRaw,
        metrics: adInsights,
      });
      adCount += 1;
      insightCount += 1;
    }
  }

  await MetaAccount.updateOne({ userId, _id: adAccount.connectionId }, { lastSyncedAt: new Date(), lastSuccessfulSyncAt: new Date(), syncHealthStatus: 'healthy' });
  await MetaAdAccount.updateOne(
    { userId, accountId: adAccount.accountId, connectionId: adAccount.connectionId },
    {
      lastSyncedAt: new Date(),
      lastInsightsSummary: accountInsightsSummary,
    }
  );
  syncJob.status = 'completed';
  syncJob.finishedAt = new Date();
  syncJob.startedAt = syncJob.startedAt || new Date();
  syncJob.lockedAt = undefined;
  syncJob.lockedBy = '';
  syncJob.nextRetryAt = undefined;
  syncJob.counts = { campaigns: campaignCount, adSets: adSetCount, ads: adCount, insights: insightCount };
  await syncJob.save();
  await logAudit(userId, 'meta_sync_completed', { connectionId: adAccount.connectionId, adAccountId: adAccount.accountId, actorType: options.jobType === 'scheduled' ? 'system' : 'user', counts: syncJob.counts });

  return { campaignCount, adSetCount, adCount, adAccount };
  } catch (err) {
    syncJob.status = 'failed';
    syncJob.finishedAt = new Date();
    syncJob.lockedAt = undefined;
    syncJob.lockedBy = '';
    syncJob.error = err.message;
    syncJob.nextRetryAt = new Date(Date.now() + Math.min(60, (syncJob.retryCount || 0) + 1) * 60 * 1000);
    await syncJob.save();
    await MetaAccount.updateOne(
      { userId, _id: adAccount.connectionId },
      { syncHealthStatus: 'error', lastErrorAt: new Date(), lastErrorMessage: err.message }
    );
    await logAudit(userId, 'meta_sync_failed', { connectionId: adAccount.connectionId, adAccountId: adAccount.accountId, actorType: 'system', error: err.message });
    throw err;
  }
}

function pushRecommendation(recommendations, data) {
  recommendations.push({
    severity: 'medium',
    category: 'delivery',
    suggestedAction: 'monitor',
    expectedImpact: '',
    actionPayload: {},
    ...data,
  });
}

function buildCampaignAgentReport(campaign, ads = [], adSets = [], recommendations = []) {
  const metrics = campaign.lastInsightsSummary || {};
  const activeAds = ads.filter((ad) => (ad.effectiveStatus || ad.status) === 'ACTIVE');
  const pausedAds = ads.filter((ad) => (ad.effectiveStatus || ad.status) === 'PAUSED');
  const activeAdSets = adSets.filter((adSet) => (adSet.effectiveStatus || adSet.status) === 'ACTIVE');
  const highSeverity = recommendations.filter((rec) => rec.severity === 'high').length;
  const creativeIssues = recommendations.filter((rec) => rec.category === 'creative').length;
  const deliveryIssues = recommendations.filter((rec) => rec.category === 'delivery' || rec.category === 'audience').length;
  const bestAd = ads
    .filter((ad) => (ad.lastInsights?.impressions || 0) > 0 || (ad.lastInsights?.spend || 0) > 0)
    .sort((a, b) => (b.lastInsights?.ctr || 0) - (a.lastInsights?.ctr || 0))[0];

  const healthScore = Math.max(0, Math.min(100,
    72
    - highSeverity * 18
    - creativeIssues * 8
    - deliveryIssues * 6
    + (metrics.ctr >= 1 ? 10 : 0)
    + (activeAds.length > 0 ? 6 : -10)
    + (activeAdSets.length > 0 ? 4 : -8)
  ));

  return {
    generatedAt: new Date(),
    healthScore,
    summary: recommendations.length
      ? `${recommendations.length} finding${recommendations.length === 1 ? '' : 's'} generated from current campaign, ad set, and ad metrics.`
      : 'No urgent issue found from the currently imported Meta data.',
    agents: [
      {
        name: 'Performance Auditor',
        status: 'completed',
        finding: `Spend ${metrics.spend || 0}, impressions ${metrics.impressions || 0}, clicks ${metrics.clicks || 0}, CTR ${(metrics.ctr || 0).toFixed(2)}%.`,
        recommendation: highSeverity > 0 ? 'Fix high-severity issues before scaling budget.' : 'Keep monitoring until more performance data arrives.',
      },
      {
        name: 'Creative Strategist',
        status: 'completed',
        finding: bestAd
          ? `Best visible ad is "${bestAd.name}" with ${(bestAd.lastInsights?.ctr || 0).toFixed(2)}% CTR.`
          : 'No imported ad creative has enough synced activity yet.',
        recommendation: creativeIssues > 0 ? 'Generate a new paused creative variant and compare hooks.' : 'Keep creative testing ready, but no urgent creative warning was detected.',
      },
      {
        name: 'Audience Analyst',
        status: 'completed',
        finding: `${activeAdSets.length} active ad set${activeAdSets.length === 1 ? '' : 's'} and ${adSets.length} total imported ad set${adSets.length === 1 ? '' : 's'}.`,
        recommendation: deliveryIssues > 0 ? 'Review audience fit and delivery quality before increasing spend.' : 'Audience structure does not show an urgent rule-based warning.',
      },
      {
        name: 'Launch Controller',
        status: 'ready',
        finding: `${activeAds.length} active ad${activeAds.length === 1 ? '' : 's'}, ${pausedAds.length} paused ad${pausedAds.length === 1 ? '' : 's'}.`,
        recommendation: 'Approved changes and agent-created ads are created paused first, then user controls launch/resume.',
      },
    ],
    nextActions: recommendations.slice(0, 4).map((rec) => ({
      title: rec.title,
      action: rec.suggestedAction,
      severity: rec.severity,
      entityType: rec.entityType,
      entityId: rec.entityId,
    })),
  };
}

async function analyzeCampaign(userId, campaignId) {
  const preference = await getPreference(userId);
  const campaign = await MetaCampaign.findOne({
    userId,
    metaCampaignId: campaignId,
    ...(preference.selectedAdAccountId ? { adAccountId: preference.selectedAdAccountId } : {}),
  });
  if (!campaign) throw new Error('Imported Meta campaign not found');
  const ads = await MetaAd.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.spend': -1 });
  const adSets = await MetaAdSet.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.spend': -1 });
  const recommendations = [];
  const m = campaign.lastInsightsSummary || {};

  if (m.spend > 0 && m.clicks < 20) {
    pushRecommendation(recommendations, {
      entityType: 'campaign',
      entityId: campaign.metaCampaignId,
      campaignId,
      title: 'Spend is not producing enough clicks',
      summary: 'The campaign has spent money but is not creating enough traffic. Review the offer, creative hook, and audience size before increasing budget.',
      severity: 'high',
      category: 'delivery',
      suggestedAction: 'monitor',
      expectedImpact: 'Avoid wasting more budget while the campaign is still weak.',
    });
  }

  if (m.ctr > 0 && m.ctr < 0.8) {
    pushRecommendation(recommendations, {
      entityType: 'campaign',
      entityId: campaign.metaCampaignId,
      campaignId,
      title: 'CTR is below a healthy starting point',
      summary: `CTR is ${m.ctr.toFixed(2)}%. Test a stronger first line, clearer benefit, and a more direct visual.`,
      severity: 'high',
      category: 'creative',
      suggestedAction: 'refresh_creative',
      expectedImpact: 'Better hooks usually improve clicks before budget changes are needed.',
    });
  }

  if (m.costPerLead > 0 && m.costPerLead > 50) {
    pushRecommendation(recommendations, {
      entityType: 'campaign',
      entityId: campaign.metaCampaignId,
      campaignId,
      title: 'Cost per lead looks high',
      summary: `Cost per lead is ${m.costPerLead.toFixed(2)}. Tighten audience intent or test a lower-friction offer.`,
      severity: 'medium',
      category: 'audience',
      suggestedAction: 'adjust_audience',
      expectedImpact: 'A better-matched audience can reduce wasted clicks.',
    });
  }

  for (const ad of ads.slice(0, 10)) {
    const adMetrics = ad.lastInsights || {};
    if (adMetrics.spend > 0 && adMetrics.ctr > 0 && adMetrics.ctr < 0.6) {
      pushRecommendation(recommendations, {
        entityType: 'ad',
        entityId: ad.metaAdId,
        campaignId,
        title: `Refresh weak ad: ${ad.name}`,
        summary: 'This ad is getting low engagement. Replace the hook or creative before spending more.',
        severity: 'high',
        category: 'creative',
        suggestedAction: 'pause',
        expectedImpact: 'Pausing weak ads protects budget for stronger variants.',
        actionPayload: { status: 'PAUSED' },
      });
    }
  }

  const bestAd = ads.filter((ad) => (ad.lastInsights?.spend || 0) > 0).sort((a, b) => (b.lastInsights?.ctr || 0) - (a.lastInsights?.ctr || 0))[0];
  if (bestAd && (bestAd.lastInsights?.ctr || 0) >= 1.5) {
    pushRecommendation(recommendations, {
      entityType: 'ad',
      entityId: bestAd.metaAdId,
      campaignId,
      title: `Scale winning ad: ${bestAd.name}`,
      summary: 'This ad has the strongest click rate in the campaign. Consider moving more budget toward its ad set.',
      severity: 'medium',
      category: 'budget',
      suggestedAction: 'scale_budget',
      expectedImpact: 'Small budget increases can grow volume while risk stays controlled.',
      actionPayload: { increasePercent: 20 },
    });
  }

  for (const adSet of adSets.slice(0, 6)) {
    const adSetMetrics = adSet.lastInsights || {};
    if (adSetMetrics.spend > 0 && adSetMetrics.clicks < 10) {
      pushRecommendation(recommendations, {
        entityType: 'adset',
        entityId: adSet.metaAdSetId,
        campaignId,
        title: `Audience needs review: ${adSet.name}`,
        summary: 'This ad set has spend but very few clicks. The audience may be too broad, too narrow, or mismatched.',
        severity: 'medium',
        category: 'audience',
        suggestedAction: 'adjust_audience',
        expectedImpact: 'Improving audience fit should lift delivery quality.',
      });
    }
  }

  if (recommendations.length === 0) {
    pushRecommendation(recommendations, {
      entityType: 'campaign',
      entityId: campaign.metaCampaignId,
      campaignId,
      title: 'No urgent issue found',
      summary: 'The campaign does not show a major warning from the latest imported data. Keep monitoring and wait for more signal before changing structure.',
      severity: 'low',
      category: 'tracking',
      suggestedAction: 'monitor',
      expectedImpact: 'Avoids unnecessary changes while data is still forming.',
    });
  }

  await MetaRecommendation.deleteMany({ userId, campaignId, status: 'pending' });
  const docs = await MetaRecommendation.insertMany(recommendations.map((rec) => ({
    userId,
    connectionId: campaign.connectionId,
    adAccountId: campaign.adAccountId,
    confidenceScore: rec.confidenceScore || (rec.severity === 'high' ? 0.85 : rec.severity === 'medium' ? 0.7 : 0.55),
    ...rec,
  })));

  const report = buildCampaignAgentReport(campaign, ads, adSets, docs);
  await MetaActionLog.create({
    userId,
    connectionId: campaign.connectionId,
    adAccountId: campaign.adAccountId,
    actionType: 'campaign_agent_audit',
    entityType: 'campaign',
    entityId: campaign.metaCampaignId,
    status: 'applied',
    requestPayload: {
      campaignId,
      adsAnalyzed: ads.length,
      adSetsAnalyzed: adSets.length,
    },
    responsePayload: report,
    appliedAt: new Date(),
  });

  return { recommendations: docs, report };
}

async function listOverview(userId) {
  const account = await MetaAccount.findOne({ userId, isValid: true, isActive: true });
  const preference = await getPreference(userId);
  const adAccounts = await MetaAdAccount.find({ userId, isActive: true }).sort({ name: 1 });
  const selected = adAccounts.find((item) => item.accountId === preference.selectedAdAccountId && String(item.connectionId) === String(preference.selectedConnectionId || item.connectionId)) || adAccounts[0] || null;
  const campaigns = await MetaCampaign.find({ userId, ...(selected ? { adAccountId: selected.accountId } : {}) }).sort({ metaUpdatedAt: -1, updatedAt: -1 });
  const recommendations = await MetaRecommendation.find({ userId, status: 'pending' }).sort({ severity: -1, createdAt: -1 }).limit(20);

  const totals = campaigns.reduce((acc, campaign) => {
    const m = campaign.lastInsightsSummary || {};
    acc.spend += m.spend || 0;
    acc.impressions += m.impressions || 0;
    acc.clicks += m.clicks || 0;
    acc.leads += m.leads || 0;
    acc.purchases += m.purchases || 0;
    return acc;
  }, { spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0 });

  totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.costPerLead = totals.leads > 0 ? totals.spend / totals.leads : 0;

  return { connected: Boolean(account), account, adAccounts, selectedAdAccount: selected, preference, totals, campaigns, recommendations };
}

async function getCampaignDetail(userId, campaignId) {
  const preference = await getPreference(userId);
  const campaign = await MetaCampaign.findOne({
    userId,
    metaCampaignId: campaignId,
    ...(preference.selectedAdAccountId ? { adAccountId: preference.selectedAdAccountId } : {}),
  });
  if (!campaign) throw new Error('Imported Meta campaign not found');
  const [adSets, ads, recommendations, actionLogs] = await Promise.all([
    MetaAdSet.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.spend': -1 }),
    MetaAd.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.spend': -1 }),
    MetaRecommendation.find({ userId, campaignId }).sort({ createdAt: -1 }),
    MetaActionLog.find({ userId, entityType: 'campaign', entityId: campaignId }).sort({ createdAt: -1 }).limit(12),
  ]);

  const latestAgentReport = actionLogs.find((log) => log.actionType === 'campaign_agent_audit')?.responsePayload || null;
  return { campaign, adSets, ads, recommendations, actionLogs, latestAgentReport };
}

async function updateCampaignStatus(userId, campaignId, status) {
  const nextStatus = String(status || '').toUpperCase();
  if (!['ACTIVE', 'PAUSED'].includes(nextStatus)) {
    throw new Error('Campaign status must be ACTIVE or PAUSED');
  }

  const preference = await getPreference(userId);
  const campaign = await MetaCampaign.findOne({
    userId,
    metaCampaignId: campaignId,
    ...(preference.selectedAdAccountId ? { adAccountId: preference.selectedAdAccountId } : {}),
  });
  if (!campaign) throw new Error('Imported Meta campaign not found');

  const account = await getConnection(userId, campaign.connectionId);
  const actionLog = await MetaActionLog.create({
    userId,
    connectionId: campaign.connectionId,
    adAccountId: campaign.adAccountId,
    actionType: nextStatus === 'PAUSED' ? 'pause_campaign' : 'activate_campaign',
    entityType: 'campaign',
    entityId: campaign.metaCampaignId,
    requestPayload: { status: nextStatus },
  });

  try {
    const response = await graphPost(`/${campaign.metaCampaignId}`, account.accessToken, { status: nextStatus });
    const fresh = await graphGet(`/${campaign.metaCampaignId}`, account.accessToken, {
      fields: 'id,name,objective,status,effective_status,updated_time',
    });

    campaign.status = fresh.status || nextStatus;
    campaign.effectiveStatus = fresh.effective_status || nextStatus;
    campaign.metaUpdatedAt = fresh.updated_time ? new Date(fresh.updated_time) : new Date();
    campaign.raw = { ...(campaign.raw || {}), status_update_response: response };
    campaign.lastSyncedAt = new Date();
    await campaign.save();

    actionLog.status = 'applied';
    actionLog.responsePayload = { response, campaign: fresh };
    actionLog.appliedAt = new Date();
    await actionLog.save();

    await logAudit(userId, 'meta_campaign_status_updated', {
      adAccountId: campaign.adAccountId,
      connectionId: campaign.connectionId,
      actorType: 'user',
      entityType: 'campaign',
      entityId: campaign.metaCampaignId,
      status: nextStatus,
    });

    return { campaign, actionLog };
  } catch (err) {
    actionLog.status = 'failed';
    actionLog.error = err.message;
    if (err.metaError) actionLog.responsePayload = { metaError: err.metaError };
    await actionLog.save();
    throw err;
  }
}

async function getAdDetail(userId, adId) {
  const ad = await MetaAd.findOne({ userId, metaAdId: adId });
  if (!ad) throw new Error('Imported Meta ad not found');
  const [campaign, adSet, recommendations, actionLogs] = await Promise.all([
    MetaCampaign.findOne({ userId, metaCampaignId: ad.metaCampaignId }),
    ad.metaAdSetId ? MetaAdSet.findOne({ userId, metaAdSetId: ad.metaAdSetId }) : null,
    MetaRecommendation.find({ userId, entityType: 'ad', entityId: ad.metaAdId }).sort({ createdAt: -1 }),
    MetaActionLog.find({ userId, entityType: 'ad', entityId: ad.metaAdId }).sort({ createdAt: -1 }).limit(20),
  ]);
  return { ad, campaign, adSet, recommendations, actionLogs };
}

async function getAdSetDetail(userId, adSetId) {
  const adSet = await MetaAdSet.findOne({ userId, metaAdSetId: adSetId });
  if (!adSet) throw new Error('Imported Meta ad set not found');
  const [campaign, ads, recommendations, actionLogs, dailyInsights] = await Promise.all([
    MetaCampaign.findOne({ userId, metaCampaignId: adSet.metaCampaignId }),
    MetaAd.find({ userId, metaAdSetId: adSet.metaAdSetId }).sort({ 'lastInsights.spend': -1 }),
    MetaRecommendation.find({ userId, entityType: 'adset', entityId: adSet.metaAdSetId }).sort({ createdAt: -1 }),
    MetaActionLog.find({ userId, entityType: 'adset', entityId: adSet.metaAdSetId }).sort({ createdAt: -1 }).limit(20),
    MetaDailyInsight.find({ userId, entityType: 'adset', entityId: adSet.metaAdSetId }).sort({ date: 1 }).limit(90),
  ]);
  return { adSet, campaign, ads, recommendations, actionLogs, dailyInsights };
}

async function analyzeAd(userId, adId) {
  const detail = await getAdDetail(userId, adId);
  const { ad, campaign } = detail;
  const m = ad.lastInsights || {};
  const recommendations = [];

  if ((m.spend || 0) > 0 && (m.clicks || 0) === 0) {
    pushRecommendation(recommendations, {
      entityType: 'ad',
      entityId: ad.metaAdId,
      campaignId: ad.metaCampaignId,
      title: 'Ad has spend but no clicks',
      summary: 'This ad is spending without creating traffic. Pause it or replace the hook before adding budget.',
      severity: 'high',
      category: 'delivery',
      suggestedAction: 'pause',
      expectedImpact: 'Protects spend while you test a stronger variant.',
      actionPayload: { status: 'PAUSED' },
    });
  }

  if ((m.ctr || 0) > 0 && (m.ctr || 0) < 0.8) {
    pushRecommendation(recommendations, {
      entityType: 'ad',
      entityId: ad.metaAdId,
      campaignId: ad.metaCampaignId,
      title: 'Ad CTR is weak',
      summary: `CTR is ${(m.ctr || 0).toFixed(2)}%. The ad likely needs a clearer first line, more direct benefit, or a different creative angle.`,
      severity: 'medium',
      category: 'creative',
      suggestedAction: 'refresh_creative',
      expectedImpact: 'A new hook can improve click quality before changing targeting.',
    });
  }

  if ((m.leads || 0) === 0 && (m.clicks || 0) >= 20) {
    pushRecommendation(recommendations, {
      entityType: 'ad',
      entityId: ad.metaAdId,
      campaignId: ad.metaCampaignId,
      title: 'Clicks are not becoming leads',
      summary: 'The ad is getting clicks but no leads. Check landing page relevance, offer friction, and conversion tracking.',
      severity: 'medium',
      category: 'tracking',
      suggestedAction: 'monitor',
      expectedImpact: 'Prevents misreading a landing page or tracking issue as an ad issue.',
    });
  }

  if (recommendations.length === 0) {
    pushRecommendation(recommendations, {
      entityType: 'ad',
      entityId: ad.metaAdId,
      campaignId: ad.metaCampaignId,
      title: 'No urgent ad-level issue found',
      summary: `This ad does not show an urgent warning from the imported data in ${campaign?.name || 'its campaign'}. Keep monitoring until more signal arrives.`,
      severity: 'low',
      category: 'tracking',
      suggestedAction: 'monitor',
      expectedImpact: 'Avoids unnecessary edits while data is limited.',
    });
  }

  await MetaRecommendation.deleteMany({ userId, entityType: 'ad', entityId: ad.metaAdId, status: 'pending' });
  return MetaRecommendation.insertMany(recommendations.map((rec) => ({
    userId,
    connectionId: ad.connectionId,
    adAccountId: ad.adAccountId,
    confidenceScore: rec.severity === 'high' ? 0.84 : rec.severity === 'medium' ? 0.7 : 0.55,
    ...rec,
  })));
}

async function analyzeAdSet(userId, adSetId) {
  const detail = await getAdSetDetail(userId, adSetId);
  const { adSet, ads } = detail;
  const m = adSet.lastInsights || {};
  const recommendations = [];

  if ((m.spend || 0) > 0 && (m.clicks || 0) < 10) {
    pushRecommendation(recommendations, {
      entityType: 'adset',
      entityId: adSet.metaAdSetId,
      campaignId: adSet.metaCampaignId,
      title: 'Ad set is spending with low click volume',
      summary: 'This ad set has spend but very few clicks. Review audience fit, placement mix, and creative relevance before increasing budget.',
      severity: 'high',
      category: 'audience',
      suggestedAction: 'adjust_audience',
      expectedImpact: 'Improves delivery quality before budget is scaled.',
    });
  }

  if ((m.ctr || 0) > 0 && (m.ctr || 0) < 0.8) {
    pushRecommendation(recommendations, {
      entityType: 'adset',
      entityId: adSet.metaAdSetId,
      campaignId: adSet.metaCampaignId,
      title: 'Audience response is weak',
      summary: `Ad set CTR is ${(m.ctr || 0).toFixed(2)}%. Test narrower intent, better creative match, or a stronger first-line hook.`,
      severity: 'medium',
      category: 'audience',
      suggestedAction: 'adjust_audience',
      expectedImpact: 'Can lift click quality without changing the whole campaign.',
    });
  }

  const activeAds = ads.filter((ad) => (ad.effectiveStatus || ad.status) === 'ACTIVE');
  if (activeAds.length === 0) {
    pushRecommendation(recommendations, {
      entityType: 'adset',
      entityId: adSet.metaAdSetId,
      campaignId: adSet.metaCampaignId,
      title: 'No active ads in this ad set',
      summary: 'This ad set has no active imported ads. Add a paused agent-created variant, review it, and launch only when ready.',
      severity: 'medium',
      category: 'structure',
      suggestedAction: 'monitor',
      expectedImpact: 'Keeps campaign structure ready without spending prematurely.',
    });
  }

  if (recommendations.length === 0) {
    pushRecommendation(recommendations, {
      entityType: 'adset',
      entityId: adSet.metaAdSetId,
      campaignId: adSet.metaCampaignId,
      title: 'No urgent ad set issue found',
      summary: 'The imported ad set metrics do not show an urgent warning. Continue monitoring until more data arrives.',
      severity: 'low',
      category: 'tracking',
      suggestedAction: 'monitor',
      expectedImpact: 'Avoids unnecessary structural changes.',
    });
  }

  await MetaRecommendation.deleteMany({ userId, entityType: 'adset', entityId: adSet.metaAdSetId, status: 'pending' });
  return MetaRecommendation.insertMany(recommendations.map((rec) => ({
    userId,
    connectionId: adSet.connectionId,
    adAccountId: adSet.adAccountId,
    confidenceScore: rec.severity === 'high' ? 0.82 : rec.severity === 'medium' ? 0.68 : 0.52,
    ...rec,
  })));
}

async function applyRecommendation(userId, recommendationId) {
  const recommendation = await MetaRecommendation.findOne({ _id: recommendationId, userId });
  if (!recommendation) throw new Error('Recommendation not found');
  if (recommendation.status !== 'pending' && recommendation.status !== 'approved') {
    throw new Error('Recommendation is already resolved');
  }

  recommendation.status = 'approved';
  await recommendation.save();

  const account = await getConnection(userId, recommendation.connectionId);
  const log = await MetaActionLog.create({
    userId,
    connectionId: recommendation.connectionId,
    adAccountId: recommendation.adAccountId,
    recommendationId: recommendation._id,
    actionType: recommendation.suggestedAction,
    entityType: recommendation.entityType,
    entityId: recommendation.entityId,
    requestPayload: recommendation.actionPayload,
  });

  try {
    let response = { skipped: true, reason: 'Recommendation is advisory only' };
    if (recommendation.suggestedAction === 'pause') {
      response = await graphPost(`/${recommendation.entityId}`, account.accessToken, { status: 'PAUSED' });
    }
    if (recommendation.suggestedAction === 'create_ad') {
      const payload = recommendation.actionPayload || {};
      if (!payload.adSetId || !payload.pageId || !payload.websiteUrl || !payload.headline || !payload.body) {
        throw new Error('Missing adSetId, pageId, websiteUrl, headline, or body for ad creation');
      }
      const websiteUrl = normalizeWebsiteUrl(payload.websiteUrl);
      const headline = textLimit(payload.headline, 40, 'Learn more');
      const body = textLimit(payload.body, 5000, headline);
      const description = textLimit(payload.description || payload.hook, 200);
      await graphGet(`/${payload.pageId}`, account.accessToken, { fields: 'id,name' });
      await graphGet(`/${payload.adSetId}`, account.accessToken, { fields: 'id,name,campaign_id,status,effective_status' });

      const accountId = normalizeActId(recommendation.adAccountId);
      const linkData = {
        link: websiteUrl,
        message: body,
        name: headline,
        call_to_action: {
          type: payload.callToActionType || 'LEARN_MORE',
          value: { link: websiteUrl },
        },
      };
      if (description) linkData.description = description;

      const creative = await graphPost(`/${accountId}/adcreatives`, account.accessToken, {
        name: textLimit(payload.creativeName, 100, `${headline} - Agent Creative`),
        object_story_spec: {
          page_id: payload.pageId,
          link_data: linkData,
        },
      });

      const ad = await graphPost(`/${accountId}/ads`, account.accessToken, {
        name: textLimit(payload.adName, 100, `${headline} - Agent Ad`),
        adset_id: payload.adSetId,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
      });

      const createdAd = await graphGet(`/${ad.id}`, account.accessToken, {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,object_story_spec,thumbnail_url}',
      });
      await MetaAd.findOneAndUpdate(
        { userId, metaAdId: ad.id },
        {
          connectionId: recommendation.connectionId,
          adAccountId: recommendation.adAccountId,
          metaCampaignId: createdAd.campaign_id || recommendation.campaignId || recommendation.entityId,
          metaAdSetId: createdAd.adset_id || payload.adSetId,
          metaAdId: ad.id,
          creativeId: creative.id,
          name: createdAd.name || textLimit(payload.adName, 100, `${headline} - Agent Ad`),
          status: createdAd.status || 'PAUSED',
          effectiveStatus: createdAd.effective_status || 'PAUSED',
          headline,
          body,
          callToActionType: payload.callToActionType || 'LEARN_MORE',
          imageUrl: createdAd.creative?.thumbnail_url || '',
          raw: createdAd,
          lastSyncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      response = { adId: ad.id, creativeId: creative.id, status: 'PAUSED' };
    }

    log.status = response.skipped ? 'queued' : 'applied';
    log.responsePayload = response;
    log.appliedAt = response.skipped ? undefined : new Date();
    await log.save();

    recommendation.status = response.skipped ? 'approved' : 'applied';
    recommendation.appliedAt = response.skipped ? undefined : new Date();
    await recommendation.save();
    await logAudit(userId, 'meta_recommendation_applied', {
      adAccountId: recommendation.adAccountId,
      connectionId: recommendation.connectionId,
      actorType: 'user',
      entityType: recommendation.entityType,
      entityId: recommendation.entityId,
      recommendationId,
      actionType: recommendation.suggestedAction,
      skipped: response.skipped,
    });
    return { recommendation, actionLog: log };
  } catch (err) {
    log.status = 'failed';
    log.error = err.message;
    if (err.metaError) log.responsePayload = { metaError: err.metaError };
    await log.save();
    recommendation.status = 'failed';
    recommendation.failedAt = new Date();
    recommendation.failureReason = err.message;
    await recommendation.save();
    await logAudit(userId, 'meta_recommendation_failed', {
      adAccountId: recommendation.adAccountId,
      connectionId: recommendation.connectionId,
      actorType: 'user',
      entityType: recommendation.entityType,
      entityId: recommendation.entityId,
      recommendationId,
      actionType: recommendation.suggestedAction,
      error: err.message,
      metaError: err.metaError,
    });
    throw err;
  }
}

async function createAgentAdRecommendation(userId, campaignId, input = {}) {
  const preference = await getPreference(userId);
  const campaign = await MetaCampaign.findOne({
    userId,
    metaCampaignId: campaignId,
    ...(preference.selectedAdAccountId ? { adAccountId: preference.selectedAdAccountId } : {}),
  });
  if (!campaign) throw new Error('Imported Meta campaign not found');

  const [ads, adSets] = await Promise.all([
    MetaAd.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.ctr': -1 }).limit(5),
    MetaAdSet.find({ userId, metaCampaignId: campaignId }).sort({ 'lastInsights.spend': -1 }),
  ]);

  const adSetId = input.adSetId || adSets[0]?.metaAdSetId;
  if (!adSetId) throw new Error('This campaign has no imported ad set to place the new ad in');
  if (!input.pageId) throw new Error('Meta Page ID is required to create a Meta ad creative');
  if (!input.websiteUrl) throw new Error('Website URL is required to create a Meta ad creative');

  const normalizedUrl = normalizeWebsiteUrl(input.websiteUrl);
  const prompt = `Create one new Meta ad variant for this existing campaign.

Campaign: ${campaign.name}
Objective: ${campaign.objective || 'unknown'}
Current ads:
${JSON.stringify(ads.map((ad) => ({
  name: ad.name,
  headline: ad.headline,
  body: ad.body,
  ctr: ad.lastInsights?.ctr || 0,
  clicks: ad.lastInsights?.clicks || 0,
})), null, 2)}

User direction: ${input.direction || 'Improve the campaign with a clearer hook and stronger offer.'}

Return ONLY JSON:
{
  "headline": "<short headline, max 40 chars>",
  "hook": "<first sentence hook>",
  "body": "<primary text, 2-4 short sentences>",
  "description": "<link description>",
  "callToActionType": "LEARN_MORE",
  "reason": "<why this variant should improve performance>"
}`;

  const response = await generateJSON({
    provider: input.provider || 'gemini',
    systemPrompt: 'You are a senior Meta ads copy strategist. Return valid JSON only.',
    userPrompt: prompt,
    agentName: 'CampaignAdCreatorAgent',
    userId,
    campaignId: campaign._id,
  });
  const generated = extractJSON(response);

  const recommendation = await MetaRecommendation.create({
    userId,
    connectionId: campaign.connectionId,
    adAccountId: campaign.adAccountId,
    entityType: 'campaign',
    entityId: campaign.metaCampaignId,
    campaignId,
    title: `Create new ad variant: ${generated.headline || campaign.name}`,
    summary: generated.reason || 'Agent generated a new ad variant based on the current campaign and ads.',
    modelVersion: 'campaign-ad-creator-v1',
    severity: 'medium',
    confidenceScore: 0.72,
    category: 'creative',
    suggestedAction: 'create_ad',
    expectedImpact: 'Creates a paused ad variant for review before launch.',
    actionPayload: {
      adSetId,
      pageId: input.pageId,
      websiteUrl: normalizedUrl,
      headline: textLimit(generated.headline, 40, campaign.name),
      hook: textLimit(generated.hook, 120),
      body: textLimit(generated.body, 5000, generated.hook || campaign.name),
      description: textLimit(generated.description, 200),
      callToActionType: generated.callToActionType || 'LEARN_MORE',
      adName: textLimit(`${campaign.name} - Agent Variant`, 100),
      creativeName: textLimit(`${campaign.name} - Agent Creative`, 100),
    },
  });

  await logAudit(userId, 'agent_ad_recommendation_created', {
    adAccountId: campaign.adAccountId,
    connectionId: campaign.connectionId,
    actorType: 'agent',
    entityType: 'campaign',
    entityId: campaign.metaCampaignId,
    recommendationId: recommendation._id,
  });

  return recommendation;
}

async function createAndPublishAgentAd(userId, campaignId, input = {}) {
  const recommendation = await createAgentAdRecommendation(userId, campaignId, input);
  const applied = await applyRecommendation(userId, recommendation._id);
  const detail = await getCampaignDetail(userId, campaignId);
  return { recommendation: applied.recommendation, actionLog: applied.actionLog, detail };
}

async function rejectRecommendation(userId, recommendationId) {
  const recommendation = await MetaRecommendation.findOneAndUpdate(
    { _id: recommendationId, userId },
    { status: 'rejected', rejectedAt: new Date() },
    { new: true }
  );
  if (!recommendation) throw new Error('Recommendation not found');
  await logAudit(userId, 'meta_recommendation_rejected', {
    adAccountId: recommendation.adAccountId,
    connectionId: recommendation.connectionId,
    actorType: 'user',
    entityType: recommendation.entityType,
    entityId: recommendation.entityId,
    recommendationId,
  });
  return recommendation;
}

async function createMetaCampaignFromDraft(userId, draft) {
  const adAccount = await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);
  const accountId = normalizeActId(adAccount.accountId);

  let sourceCampaign = null;
  if (draft.campaignId) {
    sourceCampaign = await Campaign.findOne({ _id: draft.campaignId, userId });
    if (!sourceCampaign) throw new Error('Campaign draft not found');
    if (sourceCampaign.status !== 'ready' && sourceCampaign.status !== 'meta_paused') {
      throw new Error('Generate the campaign kit before creating it in Meta');
    }
  }

  const name = draft.name || sourceCampaign?.idea || draft.idea || 'MetaBuddy Campaign';
  const objective = draft.objective || sourceCampaign?.launchConfig?.objective || 'OUTCOME_TRAFFIC';
  const campaign = await graphPost(`/${accountId}/campaigns`, account.accessToken, {
    name,
    objective,
    status: 'PAUSED',
    special_ad_categories: [],
  });

  if (sourceCampaign) {
    sourceCampaign.status = 'meta_paused';
    sourceCampaign.metaDraft = {
      campaignId: campaign.id,
      createdAt: new Date(),
      status: 'PAUSED',
    };
    await sourceCampaign.save();
  }

  await logAudit(userId, 'meta_campaign_created_paused', {
    adAccountId: adAccount.accountId,
    connectionId: adAccount.connectionId,
    actorType: 'user',
    entityType: 'campaign',
    entityId: campaign.id,
    metadata: { sourceCampaignId: sourceCampaign?._id, objective },
  });

  return campaign;
}

function mapObjectiveToOptimizationGoal(objective) {
  if (objective === 'OUTCOME_LEADS') return 'LEAD_GENERATION';
  if (objective === 'OUTCOME_ENGAGEMENT') return 'POST_ENGAGEMENT';
  return 'LINK_CLICKS';
}

function normalizeObjective(value) {
  const aliases = {
    AWARENESS: 'OUTCOME_AWARENESS',
    TRAFFIC: 'OUTCOME_TRAFFIC',
    LEADS: 'OUTCOME_LEADS',
    SALES: 'OUTCOME_SALES',
    ENGAGEMENT: 'OUTCOME_ENGAGEMENT',
  };
  const normalized = aliases[String(value || '').trim().toUpperCase()] || value;
  const allowed = new Set([
    'OUTCOME_AWARENESS',
    'OUTCOME_TRAFFIC',
    'OUTCOME_ENGAGEMENT',
    'OUTCOME_LEADS',
    'OUTCOME_SALES',
    'OUTCOME_APP_PROMOTION',
  ]);
  return allowed.has(normalized) ? normalized : 'OUTCOME_TRAFFIC';
}

function normalizeCtaType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  const allowed = new Set([
    'APPLY_NOW',
    'BOOK_NOW',
    'CONTACT_US',
    'GET_OFFER',
    'GET_QUOTE',
    'LEARN_MORE',
    'LISTEN_NOW',
    'MESSAGE_PAGE',
    'OPEN_LINK',
    'SHOP_NOW',
    'SIGN_UP',
    'SUBSCRIBE',
    'WATCH_MORE',
  ]);
  return allowed.has(normalized) ? normalized : 'LEARN_MORE';
}

function normalizeCountry(value) {
  const country = String(value || 'IN').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) throw new Error('Audience country must be a 2-letter country code, for example IN or US');
  return country;
}

function normalizeBudgetMinor(input = {}) {
  const rawMinor = Number(input.dailyBudgetMinor || 0);
  if (Number.isFinite(rawMinor) && rawMinor > 0) return Math.round(rawMinor);

  const rawMajor = Number(input.dailyBudget || 0);
  if (Number.isFinite(rawMajor) && rawMajor > 0) return Math.round(rawMajor * 100);

  throw new Error('dailyBudget or dailyBudgetMinor is required');
}

function firstImageHash(uploadResponse = {}) {
  const images = uploadResponse.images || {};
  const first = Object.values(images)[0];
  return first?.hash || uploadResponse.hash || '';
}

async function uploadMetaAdImage(userId, input = {}) {
  const adAccount = input.accountId
    ? await selectAdAccount(userId, input.accountId, input.connectionId)
    : await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);
  const accountId = normalizeActId(adAccount.accountId);
  const imageUrl = normalizeWebsiteUrl(input.imageUrl || input.url);

  const uploaded = await graphPost(`/${accountId}/adimages`, account.accessToken, {
    url: imageUrl,
  });
  const imageHash = firstImageHash(uploaded);
  if (!imageHash) throw new Error('Meta did not return an image hash for the uploaded image');

  await logAudit(userId, 'meta_ad_image_uploaded', {
    adAccountId: adAccount.accountId,
    connectionId: adAccount.connectionId,
    actorType: 'user',
    entityType: 'adimage',
    entityId: imageHash,
    imageUrl,
  });

  return { imageHash, raw: uploaded, adAccountId: adAccount.accountId };
}

async function uploadMetaAdVideo(userId, input = {}) {
  const adAccount = input.accountId
    ? await selectAdAccount(userId, input.accountId, input.connectionId)
    : await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);
  const accountId = normalizeActId(adAccount.accountId);
  const videoUrl = normalizeWebsiteUrl(input.videoUrl || input.fileUrl || input.url);

  const uploaded = await graphPost(`/${accountId}/advideos`, account.accessToken, {
    file_url: videoUrl,
  });
  if (!uploaded.id) throw new Error('Meta did not return a video_id for the uploaded video');

  await logAudit(userId, 'meta_ad_video_uploaded', {
    adAccountId: adAccount.accountId,
    connectionId: adAccount.connectionId,
    actorType: 'user',
    entityType: 'advideo',
    entityId: uploaded.id,
    videoUrl,
  });

  return { videoId: uploaded.id, raw: uploaded, adAccountId: adAccount.accountId };
}

function normalizeAdType(value, input = {}) {
  const raw = String(value || input.creativeType || input.type || '').trim().toUpperCase();
  if (['VIDEO', 'CAROUSEL', 'IMAGE', 'EXISTING_POST'].includes(raw)) return raw;
  if (input.existingPostId) return 'EXISTING_POST';
  if (input.carouselCards || input.childAttachments) return 'CAROUSEL';
  if (input.videoId || input.videoUrl) return 'VIDEO';
  return 'IMAGE';
}

function normalizeCarouselCards(input = {}) {
  const cards = input.carouselCards || input.childAttachments || input.cards || [];
  if (!Array.isArray(cards)) throw new Error('carouselCards must be an array');
  if (cards.length < 2) throw new Error('Carousel ads require at least 2 cards');
  if (cards.length > 10) throw new Error('Carousel ads can include at most 10 cards');

  return cards.map((card, index) => {
    const link = normalizeWebsiteUrl(card.link || input.websiteUrl);
    const imageHash = String(card.imageHash || card.image_hash || '').trim();
    const name = textLimit(card.name || card.headline, 40, `Card ${index + 1}`);
    const description = textLimit(card.description, 200);
    if (!imageHash && !card.imageUrl) throw new Error(`Carousel card ${index + 1} needs imageHash or imageUrl`);
    return {
      link,
      imageHash,
      imageUrl: card.imageUrl,
      name,
      description,
    };
  });
}

async function hydrateCarouselCards(userId, adAccount, cards) {
  const hydrated = [];
  for (const card of cards) {
    let imageHash = card.imageHash;
    if (!imageHash && card.imageUrl) {
      const uploaded = await uploadMetaAdImage(userId, {
        accountId: adAccount.accountId,
        connectionId: adAccount.connectionId,
        imageUrl: card.imageUrl,
      });
      imageHash = uploaded.imageHash;
    }

    hydrated.push({
      link: card.link,
      image_hash: imageHash,
      name: card.name,
      ...(card.description ? { description: card.description } : {}),
    });
  }
  return hydrated;
}

async function createSimpleMetaAdCampaign(userId, input = {}) {
  const adAccount = input.accountId
    ? await selectAdAccount(userId, input.accountId, input.connectionId)
    : await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);
  const accountId = normalizeActId(adAccount.accountId);

  const objective = normalizeObjective(input.objective);
  const adType = normalizeAdType(input.adType, input);
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl);
  const country = normalizeCountry(input.country);
  const dailyBudgetMinor = normalizeBudgetMinor(input);
  const pageId = String(input.pageId || '').trim();
  const existingPostId = String(input.existingPostId || '').trim();
  const campaignName = textLimit(input.campaignName || input.name, 100, 'MetaBuddy Campaign');
  const adSetName = textLimit(input.adSetName, 100, `${campaignName} - Ad Set`);
  const adName = textLimit(input.adName, 100, `${campaignName} - Ad`);
  const creativeName = textLimit(input.creativeName, 100, `${campaignName} - Creative`);
  const primaryText = textLimit(input.primaryText || input.body || input.message, 5000, campaignName);
  const headline = textLimit(input.headline, 40, campaignName);
  const description = textLimit(input.description, 200);
  const ctaType = normalizeCtaType(input.callToActionType || input.cta);
  const ageMin = Math.max(13, Math.min(65, Number(input.ageMin || 18)));
  const ageMax = Math.max(ageMin, Math.min(65, Number(input.ageMax || 65)));

  if (!pageId && !existingPostId) throw new Error('pageId is required unless existingPostId is provided');
  if (!existingPostId) await graphGet(`/${pageId}`, account.accessToken, { fields: 'id,name' });

  let imageHash = String(input.imageHash || '').trim();
  let videoId = String(input.videoId || '').trim();
  let carouselCards = [];

  if (adType === 'IMAGE' && !imageHash && input.imageUrl) {
    const uploaded = await uploadMetaAdImage(userId, {
      accountId: adAccount.accountId,
      connectionId: adAccount.connectionId,
      imageUrl: input.imageUrl,
    });
    imageHash = uploaded.imageHash;
  }

  if (adType === 'VIDEO' && !videoId && input.videoUrl) {
    const uploaded = await uploadMetaAdVideo(userId, {
      accountId: adAccount.accountId,
      connectionId: adAccount.connectionId,
      videoUrl: input.videoUrl,
    });
    videoId = uploaded.videoId;
  }

  if (adType === 'CAROUSEL') {
    carouselCards = await hydrateCarouselCards(userId, adAccount, normalizeCarouselCards(input));
  }

  if (adType === 'IMAGE' && !existingPostId && !imageHash) {
    throw new Error('imageHash or imageUrl is required for a new link ad creative');
  }
  if (adType === 'VIDEO' && !videoId) {
    throw new Error('videoId or videoUrl is required for a video ad creative');
  }

  const actionLog = await MetaActionLog.create({
    userId,
    connectionId: adAccount.connectionId,
    adAccountId: adAccount.accountId,
    actionType: 'create_simple_meta_ad_campaign',
    entityType: 'campaign',
    entityId: 'pending',
    requestPayload: {
      campaignName,
      objective,
      adType,
      adSetName,
      dailyBudgetMinor,
      country,
      ageMin,
      ageMax,
      pageId,
      websiteUrl,
      headline,
      ctaType,
      hasImageHash: Boolean(imageHash),
      hasVideoId: Boolean(videoId),
      carouselCardCount: carouselCards.length,
      existingPostId: existingPostId || undefined,
    },
  });

  try {
    const campaign = await graphPost(`/${accountId}/campaigns`, account.accessToken, {
      name: campaignName,
      objective,
      status: 'PAUSED',
      special_ad_categories: [],
    });

    const adSet = await graphPost(`/${accountId}/adsets`, account.accessToken, {
      name: adSetName,
      campaign_id: campaign.id,
      status: 'PAUSED',
      daily_budget: dailyBudgetMinor,
      billing_event: 'IMPRESSIONS',
      optimization_goal: mapObjectiveToOptimizationGoal(objective),
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: {
        geo_locations: { countries: [country] },
        age_min: ageMin,
        age_max: ageMax,
      },
    });

    let creativePayload = {
      name: creativeName,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link: websiteUrl,
          message: primaryText,
          name: headline,
          image_hash: imageHash,
          call_to_action: {
            type: ctaType,
            value: { link: websiteUrl },
          },
          ...(description ? { description } : {}),
        },
      },
    };

    if (adType === 'VIDEO') {
      creativePayload = {
        name: creativeName,
        object_story_spec: {
          page_id: pageId,
          video_data: {
            video_id: videoId,
            message: primaryText,
            title: headline,
            call_to_action: {
              type: ctaType,
              value: { link: websiteUrl },
            },
            ...(imageHash ? { image_hash: imageHash } : {}),
          },
        },
      };
    }

    if (adType === 'CAROUSEL') {
      creativePayload = {
        name: creativeName,
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: websiteUrl,
            message: primaryText,
            caption: new URL(websiteUrl).hostname,
            child_attachments: carouselCards,
            call_to_action: {
              type: ctaType,
              value: { link: websiteUrl },
            },
            multi_share_optimized: true,
          },
        },
      };
    }

    if (existingPostId) {
      creativePayload = {
        name: creativeName,
        object_story_id: existingPostId,
      };
    }

    const creative = await graphPost(`/${accountId}/adcreatives`, account.accessToken, creativePayload);
    const ad = await graphPost(`/${accountId}/ads`, account.accessToken, {
      name: adName,
      adset_id: adSet.id,
      creative: { creative_id: creative.id },
      status: 'PAUSED',
    });

    const [createdCampaign, createdAdSet, createdAd] = await Promise.all([
      graphGet(`/${campaign.id}`, account.accessToken, {
        fields: 'id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget,created_time,updated_time',
      }),
      graphGet(`/${adSet.id}`, account.accessToken, {
        fields: 'id,name,status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,targeting',
      }),
      graphGet(`/${ad.id}`, account.accessToken, {
        fields: 'id,name,status,effective_status,adset_id,campaign_id,creative{id,name,object_story_spec,thumbnail_url}',
      }),
    ]);

    await MetaCampaign.findOneAndUpdate(
      { userId, adAccountId: adAccount.accountId, metaCampaignId: campaign.id },
      {
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        metaCampaignId: campaign.id,
        name: createdCampaign.name || campaignName,
        objective: createdCampaign.objective || objective,
        status: createdCampaign.status || 'PAUSED',
        effectiveStatus: createdCampaign.effective_status || 'PAUSED',
        buyingType: createdCampaign.buying_type || '',
        dailyBudget: numberValue(createdCampaign.daily_budget) / 100,
        lifetimeBudget: numberValue(createdCampaign.lifetime_budget) / 100,
        metaCreatedAt: dateOrUndefined(createdCampaign.created_time),
        metaUpdatedAt: dateOrUndefined(createdCampaign.updated_time),
        sortKey: dateOrUndefined(createdCampaign.updated_time) || new Date(),
        lastSyncedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        isActive: true,
        deletedAt: undefined,
        raw: createdCampaign,
      },
      { upsert: true, new: true }
    );

    await MetaAdSet.findOneAndUpdate(
      { userId, metaAdSetId: adSet.id },
      {
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        metaCampaignId: campaign.id,
        metaAdSetId: adSet.id,
        name: createdAdSet.name || adSetName,
        status: createdAdSet.status || 'PAUSED',
        effectiveStatus: createdAdSet.effective_status || 'PAUSED',
        optimizationGoal: createdAdSet.optimization_goal || mapObjectiveToOptimizationGoal(objective),
        billingEvent: createdAdSet.billing_event || 'IMPRESSIONS',
        bidStrategy: createdAdSet.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
        dailyBudget: numberValue(createdAdSet.daily_budget) / 100,
        lifetimeBudget: numberValue(createdAdSet.lifetime_budget) / 100,
        targeting: createdAdSet.targeting || {},
        lastSyncedAt: new Date(),
        raw: createdAdSet,
      },
      { upsert: true, new: true }
    );

    const story = createdAd.creative?.object_story_spec?.link_data || createdAd.creative?.object_story_spec?.video_data || {};
    await MetaAd.findOneAndUpdate(
      { userId, metaAdId: ad.id },
      {
        connectionId: adAccount.connectionId,
        adAccountId: adAccount.accountId,
        metaCampaignId: createdAd.campaign_id || campaign.id,
        metaAdSetId: createdAd.adset_id || adSet.id,
        metaAdId: ad.id,
        creativeId: creative.id,
        name: createdAd.name || adName,
        status: createdAd.status || 'PAUSED',
        effectiveStatus: createdAd.effective_status || 'PAUSED',
        headline: story.name || headline,
        body: story.message || primaryText,
        callToActionType: story.call_to_action?.type || ctaType,
        imageUrl: story.picture || createdAd.creative?.thumbnail_url || input.imageUrl || '',
        lastSyncedAt: new Date(),
        raw: createdAd,
      },
      { upsert: true, new: true }
    );

    const result = {
      campaignId: campaign.id,
      adSetId: adSet.id,
      creativeId: creative.id,
      adId: ad.id,
      adType,
      imageHash,
      videoId,
      carouselCardCount: carouselCards.length,
      status: 'PAUSED',
    };

    actionLog.status = 'applied';
    actionLog.entityId = campaign.id;
    actionLog.responsePayload = result;
    actionLog.appliedAt = new Date();
    await actionLog.save();

    await logAudit(userId, 'simple_meta_ad_campaign_created', {
      adAccountId: adAccount.accountId,
      connectionId: adAccount.connectionId,
      actorType: 'user',
      entityType: 'campaign',
      entityId: campaign.id,
      adSetId: adSet.id,
      creativeId: creative.id,
      adId: ad.id,
    });

    return { ...result, actionLog };
  } catch (err) {
    actionLog.status = 'failed';
    actionLog.error = err.message;
    if (err.metaError) actionLog.responsePayload = { metaError: err.metaError };
    await actionLog.save();
    await logAudit(userId, 'simple_meta_ad_campaign_failed', {
      adAccountId: adAccount.accountId,
      connectionId: adAccount.connectionId,
      actorType: 'user',
      entityType: 'campaign',
      error: err.message,
      metaError: err.metaError,
    });
    throw err;
  }
}

async function getMetaAdPreview(userId, adId, input = {}) {
  const localAd = await MetaAd.findOne({ userId, metaAdId: adId });
  const adAccount = localAd
    ? await MetaAdAccount.findOne({
      userId,
      accountId: localAd.adAccountId,
      connectionId: localAd.connectionId,
      isActive: true,
    })
    : await getSelectedAdAccount(userId);
  if (!adAccount) throw new Error('Meta ad account not found');

  const account = await getConnection(userId, adAccount.connectionId);
  return graphGet(`/${adId}/previews`, account.accessToken, {
    ad_format: input.adFormat || input.ad_format || 'DESKTOP_FEED_STANDARD',
  });
}

async function getMetaCreativePreview(userId, creativeId, input = {}) {
  const localAd = await MetaAd.findOne({ userId, creativeId });
  const adAccount = localAd
    ? await MetaAdAccount.findOne({
      userId,
      accountId: localAd.adAccountId,
      connectionId: localAd.connectionId,
      isActive: true,
    })
    : await getSelectedAdAccount(userId);
  if (!adAccount) throw new Error('Meta ad account not found');

  const account = await getConnection(userId, adAccount.connectionId);
  return graphGet(`/${creativeId}/previews`, account.accessToken, {
    ad_format: input.adFormat || input.ad_format || 'DESKTOP_FEED_STANDARD',
  });
}

async function publishApprovedDraftToMeta(userId, draftId) {
  const draft = await CampaignDraft.findOne({ _id: draftId, userId });
  if (!draft) throw new Error('Campaign draft not found');
  if (draft.status !== 'approved') throw new Error('Approve the campaign draft before publishing to Meta');

  const approval = await ApprovalRequest.findOne({ userId, draftId, type: 'campaign_publish', status: 'approved' });
  if (!approval) throw new Error('Approved publish request not found');

  const adAccount = await getSelectedAdAccount(userId);
  const account = await getConnection(userId, adAccount.connectionId);
  const accountId = normalizeActId(adAccount.accountId);
  const objective = draft.launchConfig.objective || 'OUTCOME_TRAFFIC';
  const firstCopy = draft.outputs.content?.adCopies?.[0] || {};
  const campaignName = draft.title || draft.brief.slice(0, 80) || 'MetaBuddy Campaign';

  draft.status = 'publishing';
  draft.failureReason = '';
  await draft.save();

  const actionLog = await MetaActionLog.create({
    userId,
    connectionId: adAccount.connectionId,
    adAccountId: adAccount.accountId,
    actionType: 'publish_campaign_draft',
    entityType: 'campaign_draft',
    entityId: String(draft._id),
    requestPayload: {
      objective,
      launchConfig: draft.launchConfig,
      firstCopy,
    },
  });

  try {
    const canCreateFullAd =
      draft.launchConfig.websiteUrl &&
      draft.launchConfig.pageId &&
      draft.launchConfig.dailyBudgetMinor > 0 &&
      firstCopy.headline &&
      firstCopy.body;

    if (canCreateFullAd) {
      await graphGet(`/${draft.launchConfig.pageId}`, account.accessToken, { fields: 'id,name' });
    }

    const campaign = await graphPost(`/${accountId}/campaigns`, account.accessToken, {
      name: campaignName,
      objective,
      status: 'PAUSED',
      special_ad_categories: [],
    });

    const meta = {
      campaignId: campaign.id,
      adSetId: '',
      creativeId: '',
      adId: '',
      status: 'PAUSED',
      publishedAt: new Date(),
    };

    if (canCreateFullAd) {
      const adSet = await graphPost(`/${accountId}/adsets`, account.accessToken, {
        name: `${campaignName} - Agent Ad Set`,
        campaign_id: campaign.id,
        status: 'PAUSED',
        daily_budget: draft.launchConfig.dailyBudgetMinor,
        billing_event: 'IMPRESSIONS',
        optimization_goal: mapObjectiveToOptimizationGoal(objective),
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
          geo_locations: { countries: [draft.launchConfig.country || 'IN'] },
          publisher_platforms: ['facebook', 'instagram'],
        },
      });
      meta.adSetId = adSet.id;

      const creative = await graphPost(`/${accountId}/adcreatives`, account.accessToken, {
        name: `${campaignName} - Agent Creative`,
        object_story_spec: {
          page_id: draft.launchConfig.pageId,
          link_data: {
            link: draft.launchConfig.websiteUrl,
            message: firstCopy.body,
            name: firstCopy.headline,
            description: firstCopy.hook || draft.outputs.ideaExpansion?.marketAngle || '',
            call_to_action: {
              type: 'LEARN_MORE',
              value: { link: draft.launchConfig.websiteUrl },
            },
          },
        },
      });
      meta.creativeId = creative.id;

      const ad = await graphPost(`/${accountId}/ads`, account.accessToken, {
        name: `${campaignName} - Agent Ad`,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: 'PAUSED',
      });
      meta.adId = ad.id;
    }

    draft.meta = meta;
    draft.status = 'published_paused';
    await draft.save();

    approval.status = 'applied';
    approval.appliedAt = new Date();
    await approval.save();

    actionLog.status = 'applied';
    actionLog.entityType = 'campaign';
    actionLog.entityId = campaign.id;
    actionLog.responsePayload = meta;
    actionLog.appliedAt = new Date();
    await actionLog.save();

    await logAudit(userId, 'campaign_draft_published_to_meta', {
      adAccountId: adAccount.accountId,
      connectionId: adAccount.connectionId,
      actorType: 'user',
      entityType: 'campaign',
      entityId: campaign.id,
      draftId,
      createdFullAd: Boolean(meta.adId),
    });

    return { draft, actionLog, createdFullAd: Boolean(meta.adId) };
  } catch (err) {
    draft.status = 'failed';
    draft.failureReason = err.message;
    await draft.save();

    approval.status = 'failed';
    approval.failureReason = err.message;
    await approval.save();

    actionLog.status = 'failed';
    actionLog.error = err.message;
    await actionLog.save();
    throw err;
  }
}

module.exports = {
  FRONTEND_URL,
  buildOAuthUrl,
  saveConnectionFromOAuth,
  listConnections,
  disconnectConnection,
  diagnoseMetaConnection,
  syncAdAccounts,
  listAdAccounts,
  selectAdAccount,
  updatePreference,
  enqueueSyncJob,
  claimSyncJob,
  listSyncJobs,
  processNextSyncJob,
  syncCampaigns,
  listOverview,
  getCampaignDetail,
  updateCampaignStatus,
  getAdSetDetail,
  getAdDetail,
  analyzeCampaign,
  analyzeAdSet,
  analyzeAd,
  createAgentAdRecommendation,
  createAndPublishAgentAd,
  applyRecommendation,
  rejectRecommendation,
  uploadMetaAdImage,
  uploadMetaAdVideo,
  createSimpleMetaAdCampaign,
  getMetaAdPreview,
  getMetaCreativePreview,
  createMetaCampaignFromDraft,
  publishApprovedDraftToMeta,
};
