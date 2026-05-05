function cleanTerm(value) {
  return String(value || '')
    .replace(/[^\p{L}\p{N}\s₹$-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function keywordTerms(marketSignals = {}, seo = {}) {
  const fromMarket = Array.isArray(marketSignals.keywords)
    ? marketSignals.keywords.map((item) => item.term)
    : [];
  const fromSeo = Array.isArray(seo.keywords)
    ? seo.keywords.map((item) => item.term || item.keyword || item)
    : [];

  return [...fromMarket, ...fromSeo]
    .map(cleanTerm)
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 6);
}

function metaAdsLibraryUrl({ term, country = 'IN', adType = 'all' }) {
  const params = new URLSearchParams({
    active_status: 'active',
    ad_type: adType,
    country,
    is_targeted_country: 'false',
    media_type: 'all',
    q: term,
    search_type: 'keyword_unordered',
  });
  params.set('sort_data[mode]', 'relevancy_monthly_grouped');
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

function fallbackSimilarAds({ userPrompt, marketSignals, seo, country }) {
  const terms = keywordTerms(marketSignals, seo);
  const searchTerms = terms.length ? terms : [cleanTerm(userPrompt || 'product offer')];

  return searchTerms.slice(0, 4).map((term, index) => ({
    id: `meta-search-${index + 1}`,
    pageName: 'Meta Ads Library search',
    headline: term,
    body: `Open active Meta ads in India related to "${term}" and compare hooks, offer framing, visual proof, and CTA style before launch.`,
    cta: 'View Ads Library',
    platforms: ['facebook', 'instagram'],
    startDate: '',
    impressions: '',
    spend: '',
    source: 'meta_ads_library_search_url',
    isLive: false,
    searchTerm: term,
    url: metaAdsLibraryUrl({ term, country, adType: 'all' }),
    reason: 'Direct active Ads Library search for a market keyword matched to the user prompt.',
  }));
}

function normalizeMetaAd(ad, searchTerm) {
  const bodies = Array.isArray(ad.ad_creative_bodies) ? ad.ad_creative_bodies : [];
  const titles = Array.isArray(ad.ad_creative_link_titles) ? ad.ad_creative_link_titles : [];
  const descriptions = Array.isArray(ad.ad_creative_link_descriptions) ? ad.ad_creative_link_descriptions : [];

  return {
    id: ad.id || ad.ad_archive_id || `meta-live-${searchTerm}`,
    pageName: ad.page_name || 'Meta advertiser',
    headline: titles[0] || searchTerm,
    body: bodies[0] || descriptions[0] || 'Creative body unavailable from API response.',
    cta: 'View Ads Library',
    platforms: Array.isArray(ad.publisher_platforms) ? ad.publisher_platforms : [],
    startDate: ad.ad_delivery_start_time || ad.ad_creation_time || '',
    impressions: ad.impressions || '',
    spend: ad.spend || '',
    source: 'meta_ads_library_api',
    isLive: true,
    searchTerm,
    url: metaAdsLibraryUrl({ term: searchTerm, country: 'IN', adType: 'all' }),
    reason: 'Returned by Meta Ad Library API for a matched market keyword.',
  };
}

async function fetchLiveMetaAds({ term, country, token }) {
  const params = new URLSearchParams({
    access_token: token,
    ad_active_status: 'ACTIVE',
    ad_type: 'ALL',
    ad_reached_countries: JSON.stringify([country]),
    fields: [
      'id',
      'page_id',
      'page_name',
      'ad_creation_time',
      'ad_delivery_start_time',
      'ad_creative_bodies',
      'ad_creative_link_titles',
      'ad_creative_link_descriptions',
      'publisher_platforms',
      'impressions',
      'spend',
    ].join(','),
    limit: '4',
    search_terms: term,
  });

  const version = process.env.META_GRAPH_VERSION || 'v19.0';
  const response = await fetch(`https://graph.facebook.com/${version}/ads_archive?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Meta Ads Library API ${response.status}`);
  }
  const json = await response.json();
  return Array.isArray(json.data) ? json.data.map((ad) => normalizeMetaAd(ad, term)) : [];
}

async function getSimilarMetaAds(input = {}) {
  const country = input.country || 'IN';
  const token = process.env.META_AD_LIBRARY_ACCESS_TOKEN;
  const terms = keywordTerms(input.marketSignals, input.seo);
  const selectedTerms = terms.length ? terms.slice(0, 3) : [cleanTerm(input.userPrompt || input.product || 'offer')];
  const libraryUrl = metaAdsLibraryUrl({ term: selectedTerms[0] || 'offer', country, adType: 'all' });

  if (!token) {
    return {
      source: 'meta_ads_library_search_url',
      mode: 'research_links',
      liveAvailable: false,
      country,
      note: 'No META_AD_LIBRARY_ACCESS_TOKEN configured. Showing direct Meta Ads Library searches instead of scraped/live ad records.',
      libraryUrl,
      ads: fallbackSimilarAds({
        userPrompt: input.userPrompt,
        marketSignals: input.marketSignals,
        seo: input.seo,
        country,
      }),
    };
  }

  try {
    const batches = await Promise.all(selectedTerms.map((term) => fetchLiveMetaAds({ term, country, token })));
    const ads = batches.flat().filter((ad, index, list) => list.findIndex((other) => other.id === ad.id) === index).slice(0, 8);
    return {
      source: 'meta_ads_library_api',
      mode: 'live_api',
      liveAvailable: true,
      country,
      note: ads.length
        ? 'Live similar ads returned from Meta Ad Library API using market keywords from this prompt.'
        : 'Meta API returned no matching ads; use the Ads Library search links for manual review.',
      libraryUrl,
      ads: ads.length ? ads : fallbackSimilarAds({
        userPrompt: input.userPrompt,
        marketSignals: input.marketSignals,
        seo: input.seo,
        country,
      }),
    };
  } catch (err) {
    return {
      source: 'meta_ads_library_api_error',
      mode: 'research_links',
      liveAvailable: false,
      country,
      note: `${err.message}. Showing direct Meta Ads Library searches instead.`,
      libraryUrl,
      ads: fallbackSimilarAds({
        userPrompt: input.userPrompt,
        marketSignals: input.marketSignals,
        seo: input.seo,
        country,
      }),
    };
  }
}

module.exports = { getSimilarMetaAds, metaAdsLibraryUrl };
