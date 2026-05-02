/* Placeholder connector for Google Ads API */
module.exports = {
  async fetchPerformance(campaignExternalId, accessToken) {
    // TODO: Implement real Google Ads API call
    // Return mock data matching Performance schema
    return {
      platform: 'Google',
      externalId: campaignExternalId,
      impressions: 1200,
      reach: 950,
      clicks: 180,
      ctr: 0.15,
      cpc: 0.45,
      spend: 81,
      leads: 35,
      cpl: 2.3,
      conversions: 6,
      frequency: 1.1,
    };
  },
};
