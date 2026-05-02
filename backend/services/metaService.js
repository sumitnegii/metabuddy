/**
 * Meta Graph API Service
 * Handles fetching and posting campaign data to Meta's Marketing API
 */

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Helper to get the access token from environment
 */
function getAccessToken() {
  return process.env.META_ACCESS_TOKEN;
}

/**
 * Validate a Meta access token
 */
async function validateToken(accessToken) {
  const token = accessToken || getAccessToken();
  const res = await fetch(`${BASE_URL}/me?access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

/**
 * Fetch all campaigns for an ad account
 */
async function fetchCampaigns(accessToken, adAccountId) {
  const token = accessToken || getAccessToken();
  const accountId = (adAccountId || process.env.META_AD_ACCOUNT_ID).startsWith('act_') ? (adAccountId || process.env.META_AD_ACCOUNT_ID) : `act_${adAccountId || process.env.META_AD_ACCOUNT_ID}`;
  const fields = 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time,updated_time';

  const res = await fetch(
    `${BASE_URL}/${accountId}/campaigns?fields=${fields}&limit=100&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

// ... existing fetch methods updated to use getAccessToken() ...

/**
 * Create a Campaign
 */
async function createCampaign(name, objective = 'OUTCOME_TRAFFIC', status = 'PAUSED') {
  const token = getAccessToken();
  const accountId = process.env.META_AD_ACCOUNT_ID;
  
  const params = new URLSearchParams({
    name,
    objective,
    status,
    special_ad_categories: '[]',
    access_token: token
  });

  const res = await fetch(`${BASE_URL}/${accountId}/campaigns`, {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

/**
 * Create an Ad Set
 */
async function createAdSet(campaignId, name, dailyBudget = 1000, targeting = {}) {
  const token = getAccessToken();
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const defaultTargeting = {
    geo_locations: { countries: ['IN'] },
    age_min: 18,
    age_max: 45,
    targeting_automation: { advantage_audience: 0 }
  };

  const body = {
    name,
    campaign_id: campaignId,
    status: 'PAUSED',
    daily_budget: dailyBudget,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting: JSON.stringify({ ...defaultTargeting, ...targeting }),
    access_token: token
  };

  const res = await fetch(`${BASE_URL}/${accountId}/adsets`, {
    method: 'POST',
    body: new URLSearchParams(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

/**
 * Create an Ad Creative
 */
async function createAdCreative(name, pageId, message, link, imageUrl) {
  const token = getAccessToken();
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const body = {
    name,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: {
        message,
        link,
        image_url: imageUrl
      }
    }),
    access_token: token
  };

  const res = await fetch(`${BASE_URL}/${accountId}/adcreatives`, {
    method: 'POST',
    body: new URLSearchParams(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

/**
 * Create an Ad
 */
async function createAd(adSetId, creativeId, name) {
  const token = getAccessToken();
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const body = {
    name,
    adset_id: adSetId,
    creative: JSON.stringify({ creative_id: creativeId }),
    status: 'PAUSED',
    access_token: token
  };

  const res = await fetch(`${BASE_URL}/${accountId}/ads`, {
    method: 'POST',
    body: new URLSearchParams(body)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.id;
}

/**
 * Fetch insights for a specific AD
 */
async function fetchAdInsights(adId, datePreset = 'last_30d') {
  const token = getAccessToken();
  const fields = 'impressions,clicks,ctr,cpc,spend,reach,actions';

  const res = await fetch(
    `${BASE_URL}/${adId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  
  const raw = data.data?.[0] || {};
  return {
    impressions: parseInt(raw.impressions || '0'),
    clicks: parseInt(raw.clicks || '0'),
    ctr: parseFloat(raw.ctr || '0'),
    cpc: parseFloat(raw.cpc || '0'),
    spend: parseFloat(raw.spend || '0'),
    reach: parseInt(raw.reach || '0'),
  };
}

/**
 * Update Ad Status (PAUSE/ACTIVE)
 */
async function updateAdStatus(adId, status) {
  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}/${adId}?status=${status}&access_token=${token}`, {
    method: 'POST'
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.success;
}

module.exports = {
  validateToken,
  fetchCampaigns,
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
  fetchAdInsights,
  updateAdStatus,
  // ... exported other existing methods if needed ...
};

