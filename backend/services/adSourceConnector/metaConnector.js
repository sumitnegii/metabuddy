/* Placeholder connector for Meta Ads API */
module.exports = {
  async fetchPerformance(campaignExternalId, accessToken) {
    // TODO: Implement real Meta Ads API call
    // Return mock data matching Performance schema
    return {
      platform: 'Meta',
      externalId: campaignExternalId,
      impressions: 1000,
      reach: 800,
      clicks: 150,
      ctr: 0.15,
      cpc: 0.5,
      spend: 75,
      leads: 30,
      cpl: 2.5,
      conversions: 5,
      frequency: 1.2,
    };
  },
};
