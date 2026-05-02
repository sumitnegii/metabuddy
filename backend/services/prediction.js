// Simple linear regression placeholder for campaign performance prediction
// In a real product you would replace this with a proper ML model (e.g., XGBoost) and train on historical Performance data.

const mongoose = require('mongoose');
const Performance = require('../models/Performance'); // ensure path is correct

/**
 * Predict key metrics based on budget, duration (days) and price per lead.
 * @param {Object} params { budget, durationDays, pricePerLead }
 * @returns {Object} predicted metrics
 */
async function predictCampaign(params) {
  const { budget = 100, durationDays = 30, pricePerLead = 2 } = params;
  // Very naive estimation: spend = budget, leads = spend / pricePerLead
  const spend = budget;
  const leads = spend / pricePerLead;
  const cpl = pricePerLead;
  const cpc = spend / (leads * 2); // assume 2 clicks per lead
  const ctr = 0.12; // static assumption
  const impressions = Math.round(spend / cpc * 1000);
  const reach = Math.round(impressions * 0.8);
  const clicks = Math.round(impressions * ctr);

  return {
    impressions,
    reach,
    clicks,
    ctr,
    cpc,
    spend,
    leads,
    cpl,
    conversions: Math.round(leads * 0.2), // 20% conversion rate
    frequency: 1.0,
  };
}

module.exports = { predictCampaign };
