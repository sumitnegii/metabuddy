const AgentLog = require('../../models/AgentLog');
const { generateJSON } = require('./llmProvider');
const { extractJSON } = require('./jsonExtractor');
const { predictAdPerformance } = require('../mcp/analyticsMcp');
const { storeAdMemory, compareWithHistory } = require('../mcp/memoryMcp');
const { trackCostBatch } = require('../mcp/costTokenMcp');
const { getCompetitorIdeas } = require('../mcp/competitorMcp');
const { getMarketKeywordSignals } = require('../mcp/marketKeywordMcp');
const { getSimilarMetaAds } = require('../mcp/metaSimilarAdsMcp');

const INR_PER_TOKEN = 0.000021;

const AGENT_DEFINITIONS = [
  {
    id: 'persona',
    name: 'Agent 1',
    role: 'Persona',
    agentName: 'AdCreativePersonaAgent',
    provider: 'claude',
    systemPrompt: 'You are a senior audience strategist. Return ONLY valid JSON.',
    prompt: ({ userPrompt }) => `Analyze this ad creative request and create the buyer persona.\n\nUser prompt:\n${userPrompt}\n\nReturn JSON with keys: summary, age_range, intent_level, pain_points, buying_trigger, persona, pains, motivations, objections, promiseAngle.`,
  },
  {
    id: 'seo',
    name: 'Agent 2',
    role: 'SEO Keywords',
    agentName: 'AdCreativeSeoAgent',
    provider: 'claude',
    systemPrompt: 'You are an SEO and paid-social keyword strategist. Return ONLY valid JSON.',
    prompt: ({ userPrompt, previous }) => `Create keyword intelligence for this ad creative. Do NOT invent generic keywords. Start from marketKeywordSignals, then organize and expand them for Meta ad copy.\n\nUser prompt:\n${userPrompt}\n\nPersona output:\n${JSON.stringify(previous.persona || {})}\n\nMarket keyword signals:\n${JSON.stringify(previous.marketKeywordSignals || {})}\n\nAds Library signals:\n${JSON.stringify(previous.adsLibrarySignals || {})}\n\nReturn JSON with keys: summary, marketSource, keywords, primaryKeywords, priceKeywords, trustKeywords, benefitKeywords, objectionKeywords, negativeKeywords, hooks, trends. keywords must be array of objects with term, intent, hook, source, and reason.`,
  },
  {
    id: 'creative',
    name: 'Agent 3',
    role: 'Facebook Ad Creative',
    agentName: 'AdCreativeFacebookAgent',
    provider: 'claude',
    systemPrompt: 'You are a highly experienced Facebook ads creative director. Return ONLY valid JSON.',
    prompt: ({ userPrompt, previous }) => `Create exactly 9 different Facebook ad creative variations using the previous agent data. Every ad must use at least one real market keyword phrase from Agent 2. Avoid generic headlines like "Get Better Results".\n\nUser prompt:\n${userPrompt}\n\nPersona:\n${JSON.stringify(previous.persona || {})}\n\nMarket keywords:\n${JSON.stringify(previous.seo || {})}\n\nReturn JSON with keys: summary, ads, visualDirection, complianceNotes. ads must be array with type, text, headline, description, cta, bestFor, angle, keywordUsed.`,
  },
  {
    id: 'stitch',
    name: 'Agent 4',
    role: 'Stitch Report',
    agentName: 'AdCreativeStitchAgent',
    provider: 'claude',
    systemPrompt: 'You maintain all previous agent queries and outputs, then stitch one clear report. Return ONLY valid JSON.',
    prompt: ({ userPrompt, previous }) => `Stitch all previous agent data into one strategy layer and report.\n\nUser prompt:\n${userPrompt}\n\nPrevious outputs:\n${JSON.stringify(previous)}\n\nReturn JSON with keys: summary, strategy, best_angle, report, handoffChecklist, reusablePromptChain.`,
  },
  {
    id: 'auditor',
    name: 'Agent 5',
    role: 'Auditor + Predictor',
    agentName: 'AdCreativeAuditAgent',
    provider: 'claude',
    systemPrompt: 'You are a strict ad creative auditor. Compare the user prompt with all agent data. Return ONLY valid JSON.',
    prompt: ({ userPrompt, previous }) => `Audit, compare, predict, and rank all ad variations against the original prompt and previous agent data.\n\nUser prompt:\n${userPrompt}\n\nAgent data:\n${JSON.stringify(previous)}\n\nReturn JSON with keys: summary, alignmentScore, passed, results, best_ad, reason, confidence, risk_level, missingInputs, risks, recommendedFixes.`,
  },
  {
    id: 'logs',
    name: 'Agent 6',
    role: 'Logs, Cost, MCP',
    agentName: 'AdCreativeLogAgent',
    provider: 'claude',
    systemPrompt: 'You are an operations agent that creates logs, MCP context notes, and workflow documentation. Return ONLY valid JSON.',
    prompt: ({ userPrompt, previous }) => `Create operational logging, cost, history, and MCP context for this pipeline.\n\nUser prompt:\n${userPrompt}\n\nAgent data:\n${JSON.stringify(previous)}\n\nReturn JSON with keys: summary, total_tokens, total_cost, agent_breakdown, mcpContext, logSchema, tokenPolicy, mermaidNotes.`,
  },
];

function estimateTokens(text, index) {
  return Math.max(220, Math.round((String(text || '').length / 4 + 320) * (1 + index * 0.16)));
}

function liveAiEnabled() {
  return process.env.AD_CREATIVE_LIVE_AI_ENABLED === 'true';
}

const AD_INTENT_WORDS = [
  'sell',
  'promote',
  'advertise',
  'market',
  'launch',
  'generate leads',
  'get leads',
  'lead',
  'campaign',
  'ad',
  'creative',
  'meta',
  'facebook',
  'instagram',
  'shop',
  'book',
  'offer',
  'product',
  'service',
  'store',
  'ecommerce',
  'coaching',
  'clinic',
];

const BLOCKED_NON_AD_PROMPTS = new Set([
  'who are you',
  'what are you',
  'hello',
  'hi',
  'hey',
  'test',
  'thank you',
  'thanks',
  'how are you',
]);

function validateAdPrompt(value) {
  const normalized = String(value || '').toLowerCase().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Tell the agents what product, service, or lead goal you want to advertise.';
  if (BLOCKED_NON_AD_PROMPTS.has(normalized)) {
    return 'This is not an ad brief. Enter something like: I want to sell t-shirts on Meta.';
  }
  if (normalized.split(' ').length < 3 && !AD_INTENT_WORDS.some((word) => normalized.includes(word))) {
    return 'Please describe the ad goal with a product or service, for example: Sell running shoes on Meta.';
  }
  if (!AD_INTENT_WORDS.some((word) => normalized.includes(word))) {
    return 'Please enter an advertising request, not a general question. Example: Get leads for a dental clinic.';
  }
  return '';
}

function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, item) => {
    if (item && typeof item === 'object') {
      if (seen.has(item)) return '[Circular]';
      seen.add(item);
    }
    return item;
  });
}

function extractStructuredBrief(userPrompt) {
  const text = String(userPrompt || '');
  const read = (label) => {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'im'));
    return match ? match[1].trim() : '';
  };
  const promptOnly = text.split(/\n\s*Goal:/i)[0].trim();
  const inferred = inferBriefFromPrompt(promptOnly || text.trim());
  return {
    prompt: promptOnly || text.trim(),
    product: inferred.product,
    goal: read('Goal') || inferred.goal,
    audience: read('Audience') || inferred.audience,
    budget: read('Budget context') || '10000 impressions simulation',
    sector: read('Field / sector') || inferred.sector,
    persona: read('Persona') || inferred.persona,
    pains: read('Pain points') || inferred.pains,
    keywords: read('Catchy words / keywords') || inferred.keywords,
    creativeType: read('Type of ad creative') || 'Image',
    heading: read('Heading') || inferred.heading,
    imageDirection: read('Image direction') || inferred.imageDirection,
    description: read('Description') || inferred.description,
    carouselDirection: read('Carousel direction') || inferred.carouselDirection,
    oneLiner: read('One-liner') || inferred.oneLiner,
    videoDirection: read('Video direction') || inferred.videoDirection,
    ctaLink: read('Call to action / link / button') || inferred.ctaLink,
  };
}

function inferBriefFromPrompt(prompt) {
  const text = String(prompt || '').trim();
  const lower = text.toLowerCase();
  const catalog = [
    {
      test: ['t-shirt', 'tshirts', 't-shirts', 't shirt', 'tee', 'tees', 'oversized tshirt', 'graphic tee'],
      product: 't-shirts',
      sector: 'Apparel ecommerce',
      audience: 'Style-conscious shoppers looking for comfortable everyday t-shirts online',
      persona: 'Buyer looking for a good-looking t-shirt with comfortable fabric, reliable fit, and a clear reason to buy now.',
      pains: 'Poor fabric quality, bad fit, color fading, unclear size chart, boring designs',
      keywords: 'oversized t-shirts, cotton t-shirts, graphic tees, breathable fabric, stylish t-shirts, shop t-shirts',
      heading: 'Everyday T-Shirts That Fit Right',
      description: 'Comfortable t-shirts with clean style, reliable fit, and fabric made for daily wear.',
      oneLiner: 'T-shirts made for everyday comfort and style.',
      imageDirection: 'Show the t-shirt on a model with close-up fabric texture, fit detail, and color/design options.',
      carouselDirection: 'Card 1: style hook, Card 2: fabric proof, Card 3: fit/size detail, Card 4: color/design range, Card 5: shop CTA',
      videoDirection: '6-10 second mobile video: outfit shot, fabric close-up, fit movement, final shop CTA.',
      ctaLink: 'Shop Now',
    },
    {
      test: ['shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'trainer'],
      product: 'shoes',
      sector: 'Footwear ecommerce',
      audience: 'People comparing stylish, comfortable shoes online',
      persona: 'Style-conscious buyer looking for comfortable shoes that look good, fit well, and feel worth buying now.',
      pains: 'Uncomfortable fit, weak durability, hard-to-match style, uncertain sizing, unclear value',
      keywords: 'comfortable shoes, stylish sneakers, durable footwear, lightweight fit, shop shoes, everyday comfort',
      heading: 'Step Into Comfort That Looks Sharp',
      description: 'Comfortable, stylish shoes built for everyday wear with a clear reason to buy now.',
      oneLiner: 'Shoes that make comfort look good.',
      imageDirection: 'Show the shoes in a clean lifestyle scene with close-up texture, sole detail, and a confident walking pose.',
      carouselDirection: 'Card 1: style hook, Card 2: comfort proof, Card 3: durability detail, Card 4: sizing confidence, Card 5: shop CTA',
      videoDirection: '6-10 second mobile video: shoe close-up, walking shot, comfort/detail overlay, final shop CTA.',
      ctaLink: 'Shop Now',
    },
    {
      test: ['fitness', 'coach', 'gym', 'workout'],
      product: 'fitness coaching',
      sector: 'Fitness services',
      audience: 'People who want a practical fitness plan and accountability',
      persona: 'Busy person who wants visible fitness progress without guessing what to do every week.',
      pains: 'Low motivation, confusing routines, no accountability, slow progress',
      keywords: 'fitness coaching, workout plan, personal trainer, accountability, get fit',
      heading: 'Build a Fitness Plan You Can Follow',
      description: 'Clear coaching, practical workouts, and accountability for steady progress.',
      oneLiner: 'A simpler path to consistent fitness.',
      imageDirection: 'Show a coach-led workout moment, progress tracking, and approachable energy.',
      carouselDirection: 'Card 1: problem, Card 2: plan, Card 3: support, Card 4: result, Card 5: book CTA',
      videoDirection: 'Short transformation-style clip with workout moment, coaching cue, and booking CTA.',
      ctaLink: 'Book Now',
    },
    {
      test: ['candle', 'candles'],
      product: 'candles',
      sector: 'Home goods ecommerce',
      audience: 'People buying warm, giftable home fragrance products',
      persona: 'Home-focused buyer looking for a beautiful scent, calming mood, and gift-worthy presentation.',
      pains: 'Weak scent, cheap packaging, short burn time, generic gifts',
      keywords: 'handmade candles, scented candles, cozy home, gift candles, long burn',
      heading: 'Make Any Room Feel Warmer',
      description: 'Giftable candles with a cozy scent experience and polished presentation.',
      oneLiner: 'A small flame with a stronger mood.',
      imageDirection: 'Show candle glow in a real room setting with packaging and scent cues.',
      carouselDirection: 'Card 1: mood, Card 2: scent, Card 3: craft, Card 4: gift use, Card 5: shop CTA',
      videoDirection: 'Slow close-up of lighting the candle, room glow, scent note overlays, CTA.',
      ctaLink: 'Shop Now',
    },
  ];

  const match = catalog.find((item) => item.test.some((term) => lower.includes(term)));
  if (match) return { goal: 'Sales', ...match };

  const cleaned = normalizeProductName(text);
  const product = cleaned || 'offer';
  return {
    goal: lower.includes('lead') ? 'Leads' : 'Sales',
    product,
    sector: 'General business',
    audience: `People likely to need ${product}`,
    persona: `Buyer looking for a clear reason to choose ${product} and a simple next step.`,
    pains: 'Unclear value, lack of trust, too many choices, no clear reason to act now',
    keywords: `${product}, trusted, simple, proof, offer, get started`,
    heading: `Choose ${product}`,
    description: `A clear offer for people considering ${product}.`,
    oneLiner: `A better reason to choose ${product}.`,
    imageDirection: `Show ${product} clearly with a real use case, proof signal, and clean CTA.`,
    carouselDirection: 'Card 1: problem, Card 2: benefit, Card 3: proof, Card 4: offer, Card 5: CTA',
    videoDirection: `Short mobile video: problem, ${product} reveal, proof point, CTA.`,
    ctaLink: lower.includes('book') ? 'Book Now' : 'Learn More',
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
    .trim();
}

function splitList(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toMetaCta(value) {
  return String(value || 'Learn More')
    .split('-')[0]
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'LEARN_MORE';
}

function buildCreativeSeed(brief) {
  const ctaLabel = brief.ctaLink.split('-')[0].trim() || brief.ctaLink;
  return [
    brief.oneLiner,
    brief.description,
    `Built for ${brief.persona.toLowerCase()}.`,
    `Action: ${ctaLabel}.`,
  ].filter(Boolean).join(' ').slice(0, 500);
}

function keywordObjects(keywords) {
  return keywords.map((term) => {
    const lower = term.toLowerCase();
    const intent = lower.includes('buy') || lower.includes('shop') || lower.includes('delivery') || lower.includes('guarantee') ? 'high' : 'medium';
    return {
      term,
      intent,
      source: lower.includes('trusted') || lower.includes('proof') || lower.includes('guarantee') ? 'ads-library-signal' : 'user-brief',
      reason: intent === 'high' ? 'Shows purchase or offer intent.' : 'Useful for hook language and audience matching.',
    };
  });
}

function keywordTerm(keyword) {
  if (!keyword) return '';
  if (typeof keyword === 'string') return keyword;
  return keyword.term || keyword.keyword || '';
}

function marketKeywordObjects(marketSignals, fallbackKeywords) {
  const marketKeywords = Array.isArray(marketSignals.keywords) ? marketSignals.keywords : [];
  if (marketKeywords.length > 0) {
    return marketKeywords.map((keyword) => ({
      term: keyword.term,
      intent: keyword.intent || 'medium',
      hook: keyword.hook || 'market',
      source: keyword.source || marketSignals.source || 'market_seed_dataset',
      reason: keyword.reason || 'Market keyword signal matched to user input.',
    }));
  }
  return keywordObjects(fallbackKeywords);
}

function buildCreativeFromMarket({ brief, previous, userPrompt }) {
  const seo = previous.seo || {};
  const keywordList = Array.isArray(seo.keywords) ? seo.keywords : [];
  const primaryKeywords = keywordList.length ? keywordList : splitList(brief.keywords).map((term) => ({ term }));
  const topKeyword = keywordTerm(primaryKeywords.find((item) => item.intent === 'high')) || keywordTerm(primaryKeywords[0]) || brief.heading;
  const secondKeyword = keywordTerm(primaryKeywords[1]) || brief.heading;
  const priceKeyword = keywordTerm(primaryKeywords.find((item) => String(item.hook || '').includes('budget') || String(item.term || '').includes('₹'))) || topKeyword;
  const trustKeyword = keywordTerm(primaryKeywords.find((item) => ['trust', 'cod', 'shipping'].includes(String(item.hook || '')))) || secondKeyword;
  const thirdKeyword = keywordTerm(primaryKeywords[2]) || topKeyword;
  const fourthKeyword = keywordTerm(primaryKeywords[3]) || secondKeyword;
  const fifthKeyword = keywordTerm(primaryKeywords[4]) || priceKeyword;
  const sixthKeyword = keywordTerm(primaryKeywords[5]) || trustKeyword;
  const seventhKeyword = keywordTerm(primaryKeywords[6]) || topKeyword;
  const eighthKeyword = keywordTerm(primaryKeywords[7]) || secondKeyword;
  const ninthKeyword = keywordTerm(primaryKeywords[8]) || priceKeyword;
  const cta = toMetaCta(brief.ctaLink);
  const productLine = brief.oneLiner.replace(/\.$/, '');
  const description = brief.description;

  return {
    summary: 'Facebook creative generated from market keyword signals and user prompt.',
    creativeType: brief.creativeType,
    ads: [
      {
        type: 'market_keyword',
        keywordUsed: topKeyword,
        text: `${productLine}. ${topKeyword} for buyers who want comfort, style, and a simple checkout. Shop the pair that fits your everyday routine.`,
        headline: headlineFromKeyword(topKeyword),
        description,
        cta,
        bestFor: 'High-intent search and Meta feed retargeting',
        angle: 'Direct market keyword match',
      },
      {
        type: 'price_offer',
        keywordUsed: priceKeyword,
        text: `Looking for ${priceKeyword}? Pick a better option for daily use without overpaying. Add a clear offer, delivery promise, or COD message before launch.`,
        headline: headlineFromKeyword(priceKeyword),
        description,
        cta,
        bestFor: 'Budget-conscious buyers',
        angle: 'Price and value hook',
      },
      {
        type: 'trust_comfort',
        keywordUsed: trustKeyword,
        text: `${trustKeyword} is the angle: show fit, sole comfort, and real product detail. Make sizing, delivery, and return confidence obvious in the first screen.`,
        headline: headlineFromKeyword(trustKeyword),
        description,
        cta,
        bestFor: 'Cold audiences needing trust',
        angle: 'Comfort and trust proof',
      },
      {
        type: 'lifestyle',
        keywordUsed: secondKeyword,
        text: `From workdays to weekends, ${secondKeyword} gives the ad a lifestyle hook. Use walking shots, clean product close-ups, and a simple ${brief.ctaLink} CTA.`,
        headline: headlineFromKeyword(secondKeyword),
        description,
        cta,
        bestFor: 'Broad Meta prospecting',
        angle: 'Daily lifestyle use case',
      },
      {
        type: 'social_proof',
        keywordUsed: thirdKeyword,
        text: `People comparing ${thirdKeyword} need proof fast. Lead with reviews, close-up product detail, and one reason this is easier to choose today.`,
        headline: `Why Buyers Choose ${headlineFromKeyword(thirdKeyword)}`.slice(0, 72),
        description,
        cta,
        bestFor: 'Warm audiences and review-led shoppers',
        angle: 'Social proof and comparison',
      },
      {
        type: 'urgency_offer',
        keywordUsed: fourthKeyword,
        text: `${fourthKeyword} is already a buying signal. Turn it into a limited launch test with a clear deadline, simple checkout, and visible value.`,
        headline: `${headlineFromKeyword(fourthKeyword)} Today`.slice(0, 72),
        description,
        cta,
        bestFor: 'Conversion campaigns with limited offers',
        angle: 'Urgency and offer timing',
      },
      {
        type: 'reels_hook',
        keywordUsed: fifthKeyword,
        text: `First 2 seconds: show the problem. Next: reveal ${fifthKeyword}. End with fit, proof, and ${brief.ctaLink}. Built for fast-scrolling Reels traffic.`,
        headline: headlineFromKeyword(fifthKeyword),
        description,
        cta,
        bestFor: 'Instagram Reels and mobile placements',
        angle: 'Thumb-stop video hook',
      },
      {
        type: 'carousel_story',
        keywordUsed: sixthKeyword,
        text: `Use ${sixthKeyword} as a carousel story: hook, benefit, proof, objection answer, then CTA. Each card should make the next click easier.`,
        headline: `${headlineFromKeyword(sixthKeyword)} Guide`.slice(0, 72),
        description,
        cta,
        bestFor: 'Carousel education and product comparison',
        angle: 'Step-by-step buying story',
      },
      {
        type: 'objection_breaker',
        keywordUsed: seventhKeyword,
        text: `If buyers hesitate on ${seventhKeyword}, answer the objection first. Show quality, sizing or service clarity, proof, and a low-risk next step.`,
        headline: `Still Comparing ${headlineFromKeyword(seventhKeyword)}?`.slice(0, 72),
        description,
        cta,
        bestFor: 'Retargeting hesitant buyers',
        angle: 'Objection handling',
      },
      {
        type: 'premium_value',
        keywordUsed: eighthKeyword,
        text: `${eighthKeyword} can feel premium without confusing the buyer. Show quality details, use-case, and why the value is worth acting on now.`,
        headline: `Better Value: ${headlineFromKeyword(eighthKeyword)}`.slice(0, 72),
        description,
        cta,
        bestFor: 'Value-focused prospecting',
        angle: 'Premium value positioning',
      },
      {
        type: 'bundle_test',
        keywordUsed: ninthKeyword,
        text: `Test ${ninthKeyword} with a bundle or offer frame. Keep the first line clear, make the saving obvious, and close with one direct CTA.`,
        headline: `${headlineFromKeyword(ninthKeyword)} Offer`.slice(0, 72),
        description,
        cta,
        bestFor: 'Offer testing and sale campaigns',
        angle: 'Bundle and deal framing',
      },
    ],
    primaryText: `${productLine}. ${topKeyword} with a clear ${brief.ctaLink} action.`,
    headline: headlineFromKeyword(topKeyword),
    description,
    cta,
    link: brief.ctaLink.includes('http') ? brief.ctaLink : '',
    visualDirection: {
      image: brief.imageDirection,
      carousel: brief.carouselDirection,
      video: brief.videoDirection,
    },
    complianceNotes: ['Do not imply affiliation with protected brands unless authorized', 'Verify price, COD, delivery, and return claims before launch'],
    userPrompt,
  };
}

function headlineFromKeyword(keyword) {
  const text = String(keyword || '').trim();
  if (!text) return 'Shop Now';
  return text
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .slice(0, 72);
}

function fallbackOutput(definition, userPrompt, previous) {
  const previousSnapshot = JSON.parse(safeStringify(previous || '{}'));
  const brief = extractStructuredBrief(userPrompt);
  const adsLibrarySignals = getCompetitorIdeas({
    sector: brief.sector,
    audience: brief.audience,
  });
  const marketKeywordSignals = previous.marketKeywordSignals || getMarketKeywordSignals({
    prompt: userPrompt,
    sector: brief.sector,
    audience: brief.audience,
    product: brief.product,
  });
  const pains = splitList(brief.pains);
  const keywords = [
    ...splitList(brief.keywords),
    ...marketKeywordSignals.keywords.map((item) => item.term),
    ...marketKeywordSignals.hooks.slice(0, 4),
  ].filter((item, index, list) => list.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
  const creativeOutput = buildCreativeFromMarket({ brief, previous, userPrompt });
  const generatedAds = buildAdVariations(userPrompt, { creative: creativeOutput });
  const predictedAds = generatedAds.map((ad) => {
    const prediction = predictAdPerformance({
      ad_text: ad.primaryText,
      headline: ad.headline,
      cta: ad.cta,
      audience: brief.audience,
      sector: brief.sector,
    });
    return {
      ad_type: ad.id,
      ctr: prediction.ctr,
      conversion: prediction.conversion,
      score: prediction.score,
      risk: prediction.risk,
    };
  });
  const bestPredicted = [...predictedAds].sort((a, b) => b.score - a.score || b.ctr - a.ctr)[0];
  const output = {
    persona: {
      summary: 'Persona generated from prompt using deterministic intelligence engine.',
      sector: brief.sector,
      age_range: '22-45',
      intent_level: brief.audience.toLowerCase().includes('high') ? 'high' : 'medium',
      pain_points: pains.length ? pains : ['Unclear value', 'Lack of trust', 'Too much effort to compare options'],
      buying_trigger: keywords.includes('discount') ? 'discount + proof' : 'proof + clear CTA',
      persona: brief.persona,
      pains: pains.length ? pains : ['Unclear value', 'Lack of trust', 'Too much effort to compare options'],
      motivations: ['Fast result', 'Credible proof', 'Simple CTA', `Relevant ${brief.sector} offer`],
      objections: ['Will this work for me?', 'Is this worth the time or cost?'],
      promiseAngle: 'Clear outcome with proof and low-friction action.',
    },
    seo: {
      summary: `Market keyword set matched to ${marketKeywordSignals.category}.`,
      marketSource: {
        source: marketKeywordSignals.source,
        category: marketKeywordSignals.category,
        note: marketKeywordSignals.note,
      },
      adsLibrarySignals: {
        source: adsLibrarySignals.source,
        sector: adsLibrarySignals.sector,
        audience: adsLibrarySignals.audience,
        hooks: adsLibrarySignals.hooks,
        note: adsLibrarySignals.note,
      },
      keywords: marketKeywordObjects(marketKeywordSignals, keywords).slice(0, 12),
      primaryKeywords: marketKeywordObjects(marketKeywordSignals, keywords).filter((item) => item.intent === 'high').map((item) => item.term).slice(0, 8),
      priceKeywords: marketKeywordObjects(marketKeywordSignals, keywords).filter((item) => ['budget', 'discount', 'pricing', 'budget-luxury'].includes(item.hook)).map((item) => item.term),
      trustKeywords: marketKeywordObjects(marketKeywordSignals, keywords).filter((item) => ['trust', 'cod', 'shipping', 'quality'].includes(item.hook)).map((item) => item.term),
      benefitKeywords: marketKeywordSignals.hooks,
      objectionKeywords: ['sizing confidence', 'delivery trust', 'return policy', 'product quality proof'],
      negativeKeywords: marketKeywordSignals.negatives,
      hooks: marketKeywordSignals.hooks,
      trends: marketKeywordSignals.trends,
    },
    creative: creativeOutput,
    stitch: {
      summary: 'Pipeline outputs stitched into one report.',
      strategy: 'Lead with trust, support with fast-result proof, and close with one direct CTA.',
      best_angle: bestPredicted?.ad_type === 'urgency' ? 'urgency + social proof' : 'trust + clear outcome',
      report: previousSnapshot,
      handoffChecklist: ['Confirm offer', 'Confirm landing page', 'Confirm image rights', 'Confirm compliance category'],
      reusablePromptChain: AGENT_DEFINITIONS.map((item) => item.agentName),
    },
    auditor: {
      summary: 'Audit and prediction completed using Analytics MCP.',
      alignmentScore: 88,
      passed: true,
      results: predictedAds,
      best_ad: bestPredicted?.ad_type || 'urgency',
      reason: 'Ranked by blended score, CTR estimate, conversion estimate, and risk.',
      confidence: Math.round(clamp(((bestPredicted?.score || 7) / 10) * 76 + ((10 - (bestPredicted?.risk || 4)) / 10) * 24, 1, 96)),
      risk_level: (bestPredicted?.risk || 5) >= 6.5 ? 'high' : (bestPredicted?.risk || 5) >= 4 ? 'medium' : 'low',
      missingInputs: ['Offer details', 'Landing page URL', 'Brand proof'],
      risks: ['Generic claim if proof is missing'],
      recommendedFixes: ['Add one proof point', 'Use exact CTA based on offer intent'],
    },
    logs: {
      summary: 'Logs and MCP context prepared.',
      total_tokens: 0,
      total_cost: '₹0.00',
      agent_breakdown: [],
      mcpContext: ['userPrompt', 'agentOutputs', 'tokenEstimate', 'costEstimate', 'finalDecision'],
      logSchema: { prompt: 'string', output: 'object', tokens: 'number', cost: 'number' },
      tokenPolicy: 'Store estimates now; replace with provider usage when available.',
      mermaidNotes: 'Pipeline is sequential with Agent 4 stitching outputs before audit.',
    },
  };
  return output[definition.id] || { summary: 'Completed' };
}

function mermaidLabel(value, max = 64) {
  return String(value || '')
    .replace(/[`"'[\]{}()<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max) || 'Generated';
}

function mermaidDiagram({ userPrompt, agents, intelligence, requestId }) {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const node = (id, fallback) => {
    const agent = byId.get(id);
    const summary = agent?.output?.summary || fallback;
    return `${agent?.name || id}: ${agent?.role || fallback}\\n${mermaidLabel(summary, 58)}\\n${agent?.tokens || 0} tok | ₹${Number(agent?.cost || 0).toFixed(4)}`;
  };
  const best = intelligence?.bestAd;
  return `flowchart LR
  U["User input\\n${mermaidLabel(userPrompt, 72)}"] --> A1["${node('persona', 'Persona')}"]
  A1 --> A2["${node('seo', 'SEO Keywords')}"]
  A2 --> A3["${node('creative', 'Facebook Creative')}"]
  A1 --> A4["${node('stitch', 'Stitch Report')}"]
  A2 --> A4
  A3 --> A4
  A4 --> A5["${node('auditor', 'Prompt Auditor')}"]
  A5 --> A6["${node('logs', 'Logs + Cost + MCP')}"]
  A6 --> R["Final data\\nBest: ${mermaidLabel(best?.name || 'Pending', 32)}\\nScore: ${best?.adQualityScore || 0}/10 | CTR: ${best?.ctrPrediction || 0}%\\nRequest: ${requestId}"]`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function scoreFromText(text, terms, base = 6.5) {
  const lower = String(text || '').toLowerCase();
  const hits = terms.filter((term) => lower.includes(term)).length;
  return clamp(base + hits * 0.55 - (lower.length > 520 ? 0.5 : 0), 1, 10);
}

function buildAdVariations(userPrompt, previous) {
  const creative = previous.creative || {};
  if (Array.isArray(creative.ads) && creative.ads.length > 0) {
    const mapped = creative.ads.slice(0, 9).map((ad, index) => ({
      id: String(ad.type || `variation_${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: String(ad.type || `Variation ${index + 1}`).replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      bestFor: ad.bestFor || 'Campaign testing',
      primaryText: ad.text || ad.primaryText || creative.primaryText || `A better way to move from interest to action. ${userPrompt}`,
      headline: ad.headline || creative.headline || 'Get Better Results',
      description: ad.description || creative.description || 'Built for high-intent buyers',
      cta: ad.cta || creative.cta || 'LEARN_MORE',
      angle: ad.angle || 'Ad variation',
      keywordUsed: ad.keywordUsed || creative.keywordUsed || '',
    }));
    if (mapped.length >= 9) return mapped;
    const fallbackAds = fallbackVariationSet(userPrompt, creative).filter((ad) => !mapped.some((item) => item.id === ad.id));
    return [...mapped, ...fallbackAds].slice(0, 9);
  }

  return fallbackVariationSet(userPrompt, creative);
}

function fallbackVariationSet(userPrompt, creative) {
  const headline = creative.headline || 'Get Better Results';
  const primaryText = creative.primaryText || `A better way to move from interest to action. ${userPrompt}`;
  const description = creative.description || 'Built for high-intent buyers';
  const cta = creative.cta || 'LEARN_MORE';

  return [
    {
      id: 'emotional',
      name: 'Emotional',
      bestFor: 'Cold audience',
      primaryText: `Stop losing time on ads that do not connect. ${primaryText}`,
      headline,
      description,
      cta,
      angle: 'Pain-to-outcome story',
    },
    {
      id: 'urgency',
      name: 'Urgency',
      bestFor: 'Conversion campaigns',
      primaryText: `Launch the stronger version today. ${primaryText}`,
      headline: headline.length > 28 ? headline : `${headline} Today`,
      description,
      cta,
      angle: 'Fast action and direct CTA',
    },
    {
      id: 'trust',
      name: 'Trust',
      bestFor: 'Retargeting',
      primaryText: `Built for buyers who need proof before they act. ${primaryText}`,
      headline: headline.length > 34 ? 'Trusted by Smart Teams' : headline,
      description,
      cta,
      angle: 'Proof, clarity, and confidence',
    },
    {
      id: 'discount',
      name: 'Discount',
      bestFor: 'Offer testing',
      primaryText: `Make the next step easier with a clear offer. ${primaryText}`,
      headline: headline.length > 30 ? 'Claim Today’s Offer' : `${headline} Offer`,
      description,
      cta,
      angle: 'Offer-led conversion hook',
    },
    {
      id: 'social_proof',
      name: 'Social Proof',
      bestFor: 'Warm audiences',
      primaryText: `Show proof before asking for the click. ${primaryText}`,
      headline: headline.length > 24 ? headline : `${headline} With Proof`,
      description,
      cta,
      angle: 'Reviews and buyer confidence',
    },
    {
      id: 'reels_hook',
      name: 'Reels Hook',
      bestFor: 'Mobile video placements',
      primaryText: `Open with a fast visual hook, then make the offer obvious. ${primaryText}`,
      headline,
      description,
      cta,
      angle: 'Short-form thumb-stop creative',
    },
    {
      id: 'carousel_story',
      name: 'Carousel Story',
      bestFor: 'Carousel placements',
      primaryText: `Tell the buying story in steps: problem, benefit, proof, offer, CTA. ${primaryText}`,
      headline,
      description,
      cta,
      angle: 'Sequential education',
    },
    {
      id: 'objection_breaker',
      name: 'Objection Breaker',
      bestFor: 'Retargeting',
      primaryText: `Answer the reason people hesitate, then give them a lower-risk next step. ${primaryText}`,
      headline: `Still Comparing? ${headline}`.slice(0, 72),
      description,
      cta,
      angle: 'Objection handling',
    },
    {
      id: 'premium_value',
      name: 'Premium Value',
      bestFor: 'Value-focused prospecting',
      primaryText: `Make the value feel clear and premium without making the buyer think too hard. ${primaryText}`,
      headline: `Better Value: ${headline}`.slice(0, 72),
      description,
      cta,
      angle: 'Quality and value',
    },
  ];
}

function scoreVariation(variation, prediction) {
  const text = `${variation.primaryText} ${variation.headline} ${variation.description} ${variation.cta}`;
  const scores = prediction?.scores || {};
  const clarity = Number(scores.clarity || scoreFromText(text, ['clear', 'simple', 'better', 'result', 'results'], 7.1).toFixed(1));
  const emotion = Number(scores.emotion || scoreFromText(text, ['stop', 'losing', 'pain', 'connect', 'feel'], variation.id === 'emotional' ? 7.8 : 6.6).toFixed(1));
  const trust = Number(scores.trust || scoreFromText(text, ['proof', 'trusted', 'built', 'confidence', 'buyers'], variation.id === 'trust' ? 8.1 : 6.8).toFixed(1));
  const urgency = Number(scores.urgency || scoreFromText(text, ['today', 'now', 'fast', 'launch', 'direct'], variation.id === 'urgency' ? 8.3 : 6.4).toFixed(1));
  const ctaStrength = Number(scores.ctaStrength || scoreFromText(text, ['learn_more', 'shop_now', 'sign_up', 'book_now', 'cta', 'action'], 7.2).toFixed(1));
  const adQualityScore = Number(prediction?.score || ((clarity + emotion + trust + urgency + ctaStrength) / 5).toFixed(1));
  const ctrPrediction = Number(prediction?.ctr || (1.2 + adQualityScore * 0.28 + urgency * 0.06).toFixed(2));
  const conversionRate = Number(prediction?.conversion || (0.7 + adQualityScore * 0.27 + trust * 0.05).toFixed(2));
  const riskScore = Number(prediction?.risk || clamp(10 - trust + (variation.primaryText.length > 450 ? 1.2 : 0), 1, 10).toFixed(1));

  return {
    ...variation,
    scores: {
      clarity: Number(clarity.toFixed(1)),
      emotion: Number(emotion.toFixed(1)),
      trust: Number(trust.toFixed(1)),
      urgency: Number(urgency.toFixed(1)),
      ctaStrength: Number(ctaStrength.toFixed(1)),
    },
    adQualityScore,
    ctrPrediction,
    conversionRate,
    conversionProbability: Number((conversionRate / 100).toFixed(4)),
    engagementScore: Number(((emotion + urgency + ctaStrength) / 3).toFixed(1)),
    riskScore,
    predictionModel: prediction?.model || 'inline-scoring-fallback',
  };
}

function forecastAssumptions(brief, bestAd, impressions) {
  const sector = String(brief.sector || '').toLowerCase();
  const currency = 'INR';
  const cpm = sector.includes('footwear') ? 95 : sector.includes('fitness') ? 120 : 100;
  const spend = Number(((impressions / 1000) * cpm).toFixed(2));
  const clicks = Math.round(impressions * (bestAd.ctrPrediction / 100));
  const conversions = Math.max(1, Math.round(clicks * (bestAd.conversionRate / 100)));
  const reach = Math.round(impressions * 0.72);
  const frequency = Number((impressions / Math.max(reach, 1)).toFixed(2));
  const cpc = Number((spend / Math.max(clicks, 1)).toFixed(2));
  const cpa = Number((spend / Math.max(conversions, 1)).toFixed(2));
  const engagementRate = Number((Math.max(bestAd.engagementScore || 7, 1) * 0.42).toFixed(2));
  const engagements = Math.round(impressions * (engagementRate / 100));
  const saves = Math.round(engagements * 0.08);
  const shares = Math.round(engagements * 0.05);

  return {
    basis: `${impressions.toLocaleString()} impression Meta launch simulation`,
    currency,
    assumedCpm: cpm,
    reach,
    impressions,
    frequency,
    clicks,
    ctr: bestAd.ctrPrediction,
    conversions,
    conversionRate: bestAd.conversionRate,
    spend,
    cpc,
    cpa,
    engagementRate,
    engagements,
    saves,
    shares,
    confidence: Math.round(clamp((bestAd.adQualityScore / 10) * 72 + ((10 - bestAd.riskScore) / 10) * 18 + Math.min(bestAd.conversionRate, 8) * 1.25, 1, 96)),
    recommendation: clicks >= 350 && conversions >= 8
      ? 'Ready for a small controlled Meta test. Launch with a capped budget and watch CTR, CPC, and checkout events in the first 24 hours.'
      : 'Run as a small test only after tightening proof, offer, and landing-page details.',
    assumptions: [
      'Forecast uses generated copy quality, keyword intent, inline scoring, and a CPM assumption, not live Meta delivery data.',
      'Actual results depend on audience size, creative asset quality, landing page, pixel events, bid strategy, and account history.',
      'Use this as a pre-launch prediction, then replace with real Meta Ads Manager metrics after launch.',
    ],
  };
}

async function buildIntelligence({ userId, userPrompt, previous, agents }) {
  const brief = extractStructuredBrief(userPrompt);
  const baseVariations = buildAdVariations(userPrompt, previous);
  const variations = baseVariations.map((variation) => {
    const prediction = predictAdPerformance({
      ad_text: variation.primaryText,
      headline: variation.headline,
      cta: variation.cta,
      audience: brief.audience,
      sector: brief.sector,
    });
    return scoreVariation(variation, prediction);
  }).sort((a, b) => b.adQualityScore - a.adQualityScore || b.ctrPrediction - a.ctrPrediction || a.riskScore - b.riskScore)
    .map((variation, index) => ({ ...variation, rank: index + 1 }));
  const bestAd = variations[0];
  const impressions = 10000;
  const clicks = Math.round(impressions * (bestAd.ctrPrediction / 100));
  const conversions = Math.round(clicks * (bestAd.conversionRate / 100));
  const forecast = forecastAssumptions(brief, bestAd, impressions);
  const costBreakdown = agents.map((agent) => ({ name: agent.name, role: agent.role, cost: agent.cost, tokens: agent.tokens }));
  const confidence = Math.round(clamp((bestAd.adQualityScore / 10) * 72 + ((10 - bestAd.riskScore) / 10) * 18 + Math.min(bestAd.conversionRate, 8) * 1.25, 1, 96));
  const riskLevel = bestAd.riskScore >= 6.5 ? 'High' : bestAd.riskScore >= 4 ? 'Medium' : 'Low';
  const memoryComparison = await compareWithHistory(userId, {
    sector: brief.sector,
    score: bestAd.adQualityScore,
  });
  const competitorIdeas = getCompetitorIdeas({
    sector: brief.sector,
    audience: brief.audience,
  });
  const similarMetaAds = await getSimilarMetaAds({
    userPrompt,
    product: brief.product,
    marketSignals: previous.marketKeywordSignals,
    seo: previous.seo,
    country: 'IN',
  });

  const insights = [
    `${bestAd.name} creative is recommended because it has the strongest blended ad quality score (${bestAd.adQualityScore}/10).`,
    `Pre-launch confidence is ${confidence}% with ${riskLevel.toLowerCase()} risk.`,
    memoryComparison.summary,
    `Competitor hook direction to test: ${competitorIdeas.hooks[0]}.`,
    bestAd.scores.urgency < 7.5 ? 'Urgency is weaker than ideal. Add a time-bound CTA or sharper reason to act now.' : 'Urgency is strong enough for conversion-focused testing.',
    bestAd.scores.trust < 7.5 ? 'Trust can improve. Add a testimonial, proof point, rating, or recognizable brand signal.' : 'Trust signals are strong enough for retargeting and warm audiences.',
    bestAd.primaryText.length > 420 ? 'Primary text is long. Test a shorter first sentence to improve thumb-stop clarity.' : 'Primary text length is suitable for feed placement.',
  ];

  return {
    variations,
    bestAd,
    radar: [
      { metric: 'Clarity', value: bestAd.scores.clarity },
      { metric: 'Emotion', value: bestAd.scores.emotion },
      { metric: 'Trust', value: bestAd.scores.trust },
      { metric: 'Urgency', value: bestAd.scores.urgency },
      { metric: 'CTA', value: bestAd.scores.ctaStrength },
    ],
    funnel: [
      { stage: 'Impressions', value: impressions },
      { stage: 'Clicks', value: clicks },
      { stage: 'Conversions', value: conversions },
    ],
    forecast,
    costBreakdown,
    insights,
    preLaunchConfidence: confidence,
    riskLevel,
    memoryComparison,
    competitorIdeas,
    similarMetaAds,
    mcpServices: ['analytics', 'memory', 'cost-token', 'competitor'],
  };
}

async function runAdCreativePipeline({ userId, prompt }) {
  const userPrompt = String(prompt || '').trim();
  if (!userPrompt) throw new Error('Prompt is required');
  const validationError = validateAdPrompt(userPrompt);
  if (validationError) throw new Error(validationError);

  const previous = {};
  const agents = [];
  const brief = extractStructuredBrief(userPrompt);
  previous.adsLibrarySignals = getCompetitorIdeas({
    sector: brief.sector,
    audience: brief.audience,
  });
  previous.marketKeywordSignals = getMarketKeywordSignals({
    prompt: userPrompt,
    sector: brief.sector,
    audience: brief.audience,
    product: brief.product,
  });

  for (let i = 0; i < AGENT_DEFINITIONS.length; i += 1) {
    const definition = AGENT_DEFINITIONS[i];
    const started = Date.now();
    const agentPrompt = definition.prompt({ userPrompt, previous });
    let output;
    let error = '';
    const useLiveAi = liveAiEnabled();

    if (useLiveAi) {
      try {
        const text = await generateJSON({
          provider: definition.provider,
          systemPrompt: definition.systemPrompt,
          userPrompt: agentPrompt,
          agentName: definition.agentName,
          userId,
        });
        output = extractJSON(text);
      } catch (err) {
        error = err.message;
        output = fallbackOutput(definition, userPrompt, previous);
      }
    } else {
      output = fallbackOutput(definition, userPrompt, previous);
    }

    const promptTokens = estimateTokens(agentPrompt, i);
    const completionTokens = estimateTokens(safeStringify(output), i) / 2;
    const totalTokens = Math.round(promptTokens + completionTokens);
    const cost = Number((totalTokens * INR_PER_TOKEN).toFixed(4));
    const durationMs = Date.now() - started;
    previous[definition.id] = output;

    if (userId) {
      await AgentLog.create({
        userId,
        agentName: definition.agentName,
        provider: definition.provider,
        model: useLiveAi ? (error ? 'fallback-estimate' : 'provider-logged-estimate') : 'deterministic-engine',
        promptTokens,
        completionTokens,
        durationMs,
      }).catch((logErr) => console.error('Failed to log ad creative agent:', logErr));
    }

    agents.push({
      id: definition.id,
      name: definition.name,
      role: definition.role,
      agentName: definition.agentName,
      query: agentPrompt,
      status: error ? 'fallback' : 'complete',
      output,
      error,
      tokens: totalTokens,
      cost,
      durationMs,
    });
  }

  const totals = agents.reduce((acc, agent) => {
    acc.tokens += agent.tokens;
    acc.cost += agent.cost;
    return acc;
  }, { tokens: 0, cost: 0 });
  if (previous.logs) {
    previous.logs.total_tokens = totals.tokens;
    previous.logs.total_cost = `₹${totals.cost.toFixed(4)}`;
    previous.logs.agent_breakdown = agents.map((agent) => ({
      agent: agent.agentName,
      tokens: agent.tokens,
      cost: agent.cost,
    }));
    const logAgent = agents.find((agent) => agent.id === 'logs');
    if (logAgent) logAgent.output = previous.logs;
  }
  const requestId = `adcreative-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await trackCostBatch(
    userId,
    agents.map((agent) => ({
      agent: agent.agentName || agent.id,
      tokens: agent.tokens,
      cost: agent.cost,
      source: 'ad-creative-pipeline',
    })),
    requestId
  ).catch((err) => console.error('Failed to track MCP cost:', err));

  const intelligence = await buildIntelligence({
    userId,
    userPrompt,
    previous: JSON.parse(safeStringify(previous)),
    agents,
  });

  await storeAdMemory(userId, {
    prompt: userPrompt,
    sector: brief.sector,
    audience: brief.audience,
    creativeType: brief.creativeType,
    adName: intelligence.bestAd.name,
    adText: intelligence.bestAd.primaryText,
    headline: intelligence.bestAd.headline,
    cta: intelligence.bestAd.cta,
    score: intelligence.bestAd.adQualityScore,
    ctr: intelligence.bestAd.ctrPrediction,
    conversion: intelligence.bestAd.conversionRate,
    riskScore: intelligence.bestAd.riskScore,
    tokens: totals.tokens,
    cost: totals.cost,
    metadata: {
      requestId,
      mcpServices: intelligence.mcpServices,
      competitorIdeas: intelligence.competitorIdeas,
    },
  }).catch((err) => console.error('Failed to store ad creative memory:', err));

  return {
    agents,
    totals: { tokens: totals.tokens, cost: Number(totals.cost.toFixed(4)) },
    intelligence,
    report: previous.stitch,
    audit: previous.auditor,
    mcp: previous.logs,
    mermaid: mermaidDiagram({ userPrompt, agents, intelligence, requestId }),
  };
}

function definitionForStep(step) {
  const index = Number(step) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= AGENT_DEFINITIONS.length) {
    throw new Error('step must be a number from 1 to 6');
  }
  return { definition: AGENT_DEFINITIONS[index], index };
}

function hydratePrevious(userPrompt, previous = {}) {
  const next = previous && typeof previous === 'object' && !Array.isArray(previous) ? { ...previous } : {};
  const brief = extractStructuredBrief(userPrompt);
  if (!next.adsLibrarySignals) {
    next.adsLibrarySignals = getCompetitorIdeas({
      sector: brief.sector,
      audience: brief.audience,
    });
  }
  if (!next.marketKeywordSignals) {
    next.marketKeywordSignals = getMarketKeywordSignals({
      prompt: userPrompt,
      sector: brief.sector,
      audience: brief.audience,
      product: brief.product,
    });
  }
  return next;
}

async function executeAgent({ userId, userPrompt, previous, definition, index }) {
  const started = Date.now();
  const agentPrompt = definition.prompt({ userPrompt, previous });
  let output;
  let error = '';
  const useLiveAi = liveAiEnabled();

  if (useLiveAi) {
    try {
      const text = await generateJSON({
        provider: definition.provider,
        systemPrompt: definition.systemPrompt,
        userPrompt: agentPrompt,
        agentName: definition.agentName,
        userId,
      });
      output = extractJSON(text);
    } catch (err) {
      error = err.message;
      output = fallbackOutput(definition, userPrompt, previous);
    }
  } else {
    output = fallbackOutput(definition, userPrompt, previous);
  }

  const promptTokens = estimateTokens(agentPrompt, index);
  const completionTokens = estimateTokens(safeStringify(output), index) / 2;
  const totalTokens = Math.round(promptTokens + completionTokens);
  const cost = Number((totalTokens * INR_PER_TOKEN).toFixed(4));
  const durationMs = Date.now() - started;

  if (userId) {
    await AgentLog.create({
      userId,
      agentName: definition.agentName,
      provider: definition.provider,
      model: useLiveAi ? (error ? 'fallback-estimate' : 'provider-logged-estimate') : 'deterministic-engine',
      promptTokens,
      completionTokens,
      durationMs,
    }).catch((logErr) => console.error('Failed to log ad creative agent step:', logErr));
  }

  return {
    id: definition.id,
    name: definition.name,
    role: definition.role,
    agentName: definition.agentName,
    query: agentPrompt,
    status: error ? 'fallback' : 'complete',
    output,
    error,
    tokens: totalTokens,
    cost,
    durationMs,
  };
}

async function finalizeStepRun({ userId, userPrompt, previous, agents }) {
  const totals = agents.reduce((acc, agent) => {
    acc.tokens += Number(agent.tokens || 0);
    acc.cost += Number(agent.cost || 0);
    return acc;
  }, { tokens: 0, cost: 0 });

  if (previous.logs) {
    previous.logs.total_tokens = totals.tokens;
    previous.logs.total_cost = `₹${totals.cost.toFixed(4)}`;
    previous.logs.agent_breakdown = agents.map((agent) => ({
      agent: agent.agentName,
      tokens: agent.tokens,
      cost: agent.cost,
    }));
    const logAgent = agents.find((agent) => agent.id === 'logs');
    if (logAgent) logAgent.output = previous.logs;
  }

  const requestId = `adcreative-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await trackCostBatch(
    userId,
    agents.map((agent) => ({
      agent: agent.agentName || agent.id,
      tokens: agent.tokens,
      cost: agent.cost,
      source: 'ad-creative-step-pipeline',
    })),
    requestId
  ).catch((err) => console.error('Failed to track MCP cost:', err));

  const intelligence = await buildIntelligence({
    userId,
    userPrompt,
    previous: JSON.parse(safeStringify(previous)),
    agents,
  });

  const brief = extractStructuredBrief(userPrompt);
  await storeAdMemory(userId, {
    prompt: userPrompt,
    sector: brief.sector,
    audience: brief.audience,
    creativeType: brief.creativeType,
    adName: intelligence.bestAd.name,
    adText: intelligence.bestAd.primaryText,
    headline: intelligence.bestAd.headline,
    cta: intelligence.bestAd.cta,
    score: intelligence.bestAd.adQualityScore,
    ctr: intelligence.bestAd.ctrPrediction,
    conversion: intelligence.bestAd.conversionRate,
    riskScore: intelligence.bestAd.riskScore,
    tokens: totals.tokens,
    cost: totals.cost,
    metadata: {
      requestId,
      mcpServices: intelligence.mcpServices,
      competitorIdeas: intelligence.competitorIdeas,
      execution: 'frontend-step-loop',
    },
  }).catch((err) => console.error('Failed to store ad creative memory:', err));

  return {
    agents,
    totals: { tokens: totals.tokens, cost: Number(totals.cost.toFixed(4)) },
    intelligence,
    report: previous.stitch,
    audit: previous.auditor,
    mcp: previous.logs,
    mermaid: mermaidDiagram({ userPrompt, agents, intelligence, requestId }),
  };
}

async function runAdCreativeStep({ userId, step, data = {} }) {
  const { definition, index } = definitionForStep(step);
  const userPrompt = String(data.userPrompt || data.prompt || '').trim();
  if (!userPrompt) throw new Error('data.userPrompt is required');
  const validationError = validateAdPrompt(userPrompt);
  if (validationError) throw new Error(validationError);

  const previous = hydratePrevious(userPrompt, data.previous);
  const agent = await executeAgent({
    userId,
    userPrompt,
    previous,
    definition,
    index,
  });

  previous[definition.id] = agent.output;
  const agents = [...(Array.isArray(data.agents) ? data.agents : []), agent];
  let final = null;

  if (Number(step) === AGENT_DEFINITIONS.length) {
    final = await finalizeStepRun({ userId, userPrompt, previous, agents });
  }

  return {
    step: Number(step),
    output: agent.output,
    agent,
    previous,
    agents,
    nextStep: Number(step) < AGENT_DEFINITIONS.length ? Number(step) + 1 : null,
    done: Number(step) === AGENT_DEFINITIONS.length,
    final,
  };
}

module.exports = { runAdCreativePipeline, runAdCreativeStep };
