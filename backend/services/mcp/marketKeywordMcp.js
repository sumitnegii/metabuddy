const MARKET_KEYWORD_DATASETS = [
  {
    id: 'apparel-tshirts-india',
    match: ['t-shirt', 'tshirts', 't-shirts', 't shirt', 'tee', 'tees', 'graphic tee', 'oversized tshirt', 'oversized t-shirt'],
    category: 'Apparel ecommerce',
    source: 'market_seed_dataset:apparel_tshirts_india',
    note: 'Curated MVP keyword set modeled after India apparel search and paid-social buyer phrases. Replace with SerpAPI, Google Trends, or Meta Ads Library ingestion when credentials are available.',
    keywords: [
      { term: 'oversized t-shirts for men', intent: 'high', hook: 'style', source: 'google_ads_seed', reason: 'Direct product search with strong apparel purchase intent.' },
      { term: 'graphic t-shirts online India', intent: 'high', hook: 'design', source: 'google_ads_seed', reason: 'Design-led ecommerce query for online buyers.' },
      { term: 'cotton t-shirts under ₹999', intent: 'high', hook: 'budget', source: 'marketplace_seed', reason: 'Price and fabric-led phrase for value shoppers.' },
      { term: 'premium cotton t-shirts India', intent: 'medium', hook: 'quality', source: 'search_seed', reason: 'Quality-led phrase for shoppers comparing fabric.' },
      { term: 'streetwear t-shirts India', intent: 'medium', hook: 'streetwear', source: 'meta_ads_library_seed', reason: 'Paid-social style phrase suited to Meta feed and Reels.' },
      { term: 'plain t-shirts for daily wear', intent: 'high', hook: 'daily-wear', source: 'google_ads_seed', reason: 'Use-case phrase for repeat everyday apparel buyers.' },
      { term: 'buy t-shirts online COD', intent: 'high', hook: 'cod', source: 'marketplace_seed', reason: 'Combines purchase intent with checkout trust.' },
      { term: 'breathable summer t-shirts', intent: 'medium', hook: 'comfort', source: 'seasonal_seed', reason: 'Comfort and seasonality angle for India apparel ads.' },
      { term: 'anime printed t-shirts India', intent: 'medium', hook: 'niche-design', source: 'trend_seed', reason: 'Niche design phrase useful for interest-led targeting.' },
      { term: 'combo t-shirt offer', intent: 'high', hook: 'bundle', source: 'marketplace_seed', reason: 'Offer-led apparel keyword for conversion campaigns.' },
    ],
    hooks: [
      'Oversized fit with streetwear styling',
      'Cotton comfort under ₹999',
      'COD and easy size exchange trust angle',
      'Graphic tees for everyday outfits',
      'Combo t-shirt offer for value buyers',
    ],
    trends: [
      'Oversized streetwear t-shirts',
      'Graphic and anime prints',
      'Cotton comfort for summer',
      'Bundle and combo apparel offers',
    ],
    negatives: ['t-shirt printing machine', 'jobs', 'wholesale only', 'free t-shirt', 'blank t-shirt supplier'],
  },
  {
    id: 'footwear-india',
    match: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'trainer', 'running shoe', 'sports shoe'],
    category: 'Footwear ecommerce',
    source: 'market_seed_dataset:footwear_india',
    note: 'Curated MVP keyword set modeled after search and paid-social buyer phrases. Replace with SerpAPI, Google Trends, or Meta Ads Library ingestion when credentials are available.',
    keywords: [
      { term: 'running shoes for men', intent: 'high', hook: 'product', source: 'google_ads_seed', reason: 'Direct product search with clear purchase intent.' },
      { term: 'best sneakers under ₹2000', intent: 'high', hook: 'budget', source: 'google_ads_seed', reason: 'Price-led comparison query for budget buyers.' },
      { term: 'buy sports shoes online India COD', intent: 'high', hook: 'cod', source: 'marketplace_seed', reason: 'Combines buy intent, online purchase, India, and cash-on-delivery trust cue.' },
      { term: 'lightweight gym shoes for men', intent: 'high', hook: 'performance', source: 'google_ads_seed', reason: 'Use-case keyword for gym and training shoppers.' },
      { term: 'breathable sneakers for daily wear', intent: 'medium', hook: 'comfort', source: 'meta_ads_library_seed', reason: 'Good paid-social phrase for comfort-led creative.' },
      { term: 'Nike style shoes affordable India', intent: 'medium', hook: 'aspirational-budget', source: 'competitor_seed', reason: 'Captures brand-style aspiration without claiming branded affiliation.' },
      { term: 'top rated running shoes India', intent: 'high', hook: 'trust', source: 'google_ads_seed', reason: 'Review-led query with comparison intent.' },
      { term: 'comfortable walking shoes for men', intent: 'high', hook: 'comfort', source: 'google_ads_seed', reason: 'Pain-solution keyword for everyday use.' },
      { term: 'sports shoes sale India', intent: 'high', hook: 'discount', source: 'google_ads_seed', reason: 'Sale-driven phrase for offer-led campaigns.' },
      { term: 'casual sneakers for daily wear', intent: 'medium', hook: 'lifestyle', source: 'meta_ads_library_seed', reason: 'Lifestyle phrase suited to feed and reels copy.' },
      { term: 'durable running shoes for beginners', intent: 'medium', hook: 'beginner', source: 'search_seed', reason: 'Useful persona segment for new runners.' },
      { term: 'men shoes free delivery', intent: 'high', hook: 'shipping', source: 'marketplace_seed', reason: 'Purchase-friction keyword focused on delivery value.' },
    ],
    hooks: [
      'Best running shoes under ₹2000',
      'Lightweight comfort for daily wear',
      'COD and free delivery trust angle',
      'Top-rated sports shoes without premium pricing',
      'Breathable sneakers for work, gym, and weekends',
    ],
    trends: [
      'Budget performance footwear',
      'Breathable everyday sneakers',
      'COD and delivery confidence',
      'Gym-to-street styling',
    ],
    negatives: ['shoe repair', 'jobs', 'wholesale only', 'free shoes', 'shoe rack'],
  },
  {
    id: 'fitness-services',
    match: ['fitness', 'coach', 'gym', 'workout', 'trainer'],
    category: 'Fitness services',
    source: 'market_seed_dataset:fitness_services',
    note: 'Curated MVP keyword set for paid-social and search intent.',
    keywords: [
      { term: 'online fitness coach India', intent: 'high', hook: 'service', source: 'google_ads_seed', reason: 'Direct service search.' },
      { term: 'weight loss workout plan for beginners', intent: 'high', hook: 'beginner', source: 'google_ads_seed', reason: 'Outcome-led buyer phrase.' },
      { term: 'personal trainer online monthly plan', intent: 'high', hook: 'pricing', source: 'search_seed', reason: 'Commercial plan query.' },
      { term: 'home workout accountability coach', intent: 'medium', hook: 'accountability', source: 'meta_ads_library_seed', reason: 'Good paid-social pain angle.' },
    ],
    hooks: ['Lose weight with a plan you can follow', 'Online coaching with accountability', 'Beginner-friendly home workout plan'],
    trends: ['At-home coaching', 'Beginner transformation plans', 'Monthly accountability programs'],
    negatives: ['gym jobs', 'free workout pdf', 'fitness equipment repair'],
  },
  {
    id: 'home-candles',
    match: ['candle', 'candles', 'scented candle', 'home fragrance'],
    category: 'Home goods ecommerce',
    source: 'market_seed_dataset:home_candles',
    note: 'Curated MVP keyword set for gift and home fragrance campaigns.',
    keywords: [
      { term: 'scented candles gift set India', intent: 'high', hook: 'gift', source: 'google_ads_seed', reason: 'Gift-led shopping phrase.' },
      { term: 'handmade soy candles online', intent: 'high', hook: 'craft', source: 'google_ads_seed', reason: 'Direct product purchase query.' },
      { term: 'luxury candles under ₹999', intent: 'high', hook: 'budget-luxury', source: 'search_seed', reason: 'Price-led premium positioning.' },
      { term: 'long lasting fragrance candles', intent: 'medium', hook: 'quality', source: 'meta_ads_library_seed', reason: 'Benefit phrase for creative copy.' },
    ],
    hooks: ['Gift-ready scented candles', 'Luxury mood under ₹999', 'Long-lasting fragrance for cozy rooms'],
    trends: ['Giftable home fragrance', 'Soy wax positioning', 'Cozy room decor'],
    negatives: ['candle making jobs', 'free candle samples', 'wholesale wax'],
  },
];

function getMarketKeywordSignals(input = {}) {
  const text = [
    input.prompt,
    input.sector,
    input.audience,
    input.product,
  ].filter(Boolean).join(' ').toLowerCase();

  const dataset = MARKET_KEYWORD_DATASETS.find((item) => item.match.some((term) => text.includes(term))) || null;
  if (!dataset) {
    const product = normalizeProductName(input.product || input.prompt || 'offer');
    return {
      source: 'market_seed_dataset:generic',
      category: input.sector || 'General business',
      note: 'Generic market dataset fallback. Add a category dataset or connect a live provider for stronger market intelligence.',
      keywords: [
        { term: `${product} online`, intent: 'medium', hook: 'product', source: 'generic_seed', reason: 'Basic product discovery phrase.' },
        { term: `best ${product}`, intent: 'medium', hook: 'comparison', source: 'generic_seed', reason: 'Comparison-led buyer phrase.' },
        { term: `buy ${product}`, intent: 'high', hook: 'purchase', source: 'generic_seed', reason: 'Direct purchase phrase.' },
        { term: `${product} offer`, intent: 'high', hook: 'discount', source: 'generic_seed', reason: 'Offer-led conversion phrase.' },
      ],
      hooks: [`Best ${product}`, `Buy ${product} online`, `Limited-time ${product} offer`],
      trends: ['Comparison shopping', 'Offer-led search', 'Trust-led conversion'],
      negatives: ['jobs', 'free only', 'repair', 'unrelated tutorial'],
    };
  }

  return {
    source: dataset.source,
    category: dataset.category,
    note: dataset.note,
    keywords: dataset.keywords,
    hooks: dataset.hooks,
    trends: dataset.trends,
    negatives: dataset.negatives,
  };
}

function normalizeProductName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/^i\s+(want|need|would like)\s+to\s+/i, '')
    .replace(/^(sell|promote|advertise|market|launch)\s+/i, '')
    .replace(/^(my|our|the|a|an)\s+/i, '')
    .replace(/\s+(on|in)\s+(meta|facebook|instagram|ads?)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim() || 'offer';
}

module.exports = { getMarketKeywordSignals };
