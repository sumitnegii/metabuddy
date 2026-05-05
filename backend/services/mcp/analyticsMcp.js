function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function scoreText(text, terms, base) {
  const lower = String(text || '').toLowerCase();
  const hits = terms.filter((term) => lower.includes(term)).length;
  return clamp(base + hits * 0.55 - (lower.length > 520 ? 0.45 : 0), 1, 10);
}

function predictAdPerformance(input = {}) {
  const adText = String(input.ad_text || input.adText || '');
  const headline = String(input.headline || '');
  const cta = String(input.cta || '');
  const audience = String(input.audience || '').toLowerCase();
  const sector = String(input.sector || '').toLowerCase();
  const fullText = `${headline} ${adText} ${cta}`;

  const clarity = scoreText(fullText, ['clear', 'simple', 'easy', 'fast', 'result', 'results', 'today'], 7.0);
  const emotion = scoreText(fullText, ['stop', 'pain', 'confidence', 'love', 'feel', 'worry', 'miss'], 6.6);
  const trust = scoreText(fullText, ['proof', 'trusted', 'verified', 'reviews', 'guarantee', 'secure', 'risk-free'], 6.8);
  const urgency = scoreText(fullText, ['now', 'today', 'limited', 'fast', 'instant', 'ends', 'shop'], 6.4);
  const ctaStrength = scoreText(fullText, ['shop', 'learn', 'book', 'start', 'claim', 'get', 'buy'], 7.1);
  const audienceFit = audience.includes('high-intent') || audience.includes('retarget') ? 0.35 : 0;
  const sectorFit = sector.includes('ecommerce') || sector.includes('commerce') ? 0.25 : 0;
  const score = Number(clamp((clarity + emotion + trust + urgency + ctaStrength) / 5 + audienceFit + sectorFit, 1, 10).toFixed(1));
  const ctr = Number((1.1 + score * 0.28 + urgency * 0.06 + ctaStrength * 0.04).toFixed(2));
  const conversion = Number((0.6 + score * 0.25 + trust * 0.07 + audienceFit).toFixed(2));
  const risk = Number(clamp(10 - trust + (adText.length > 450 ? 0.9 : 0), 1, 10).toFixed(1));

  return {
    ctr,
    conversion,
    score,
    risk,
    scores: {
      clarity: Number(clarity.toFixed(1)),
      emotion: Number(emotion.toFixed(1)),
      trust: Number(trust.toFixed(1)),
      urgency: Number(urgency.toFixed(1)),
      ctaStrength: Number(ctaStrength.toFixed(1)),
    },
    model: 'deterministic-analytics-mcp-v1',
  };
}

module.exports = { predictAdPerformance };
