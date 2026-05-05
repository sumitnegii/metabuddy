function getCompetitorIdeas(input = {}) {
  const sector = String(input.sector || 'general').toLowerCase();
  const audience = String(input.audience || 'buyers').toLowerCase();

  const ecommerceHooks = [
    'Trusted by verified buyers',
    'Ships fast, returns stay simple',
    'See why shoppers switch',
    'Proof first, purchase second',
    'Limited-time offer with clear guarantee',
  ];
  const saasHooks = [
    'Turn manual work into one clean workflow',
    'See the dashboard before you commit',
    'Reduce wasted spend with clearer decisions',
    'Built for teams that need proof',
    'Start with the highest-impact fix',
  ];
  const hooks = sector.includes('commerce') ? ecommerceHooks : sector.includes('saas') ? saasHooks : [
    'Clear outcome, lower risk',
    'Proof-backed decision',
    'Fast setup, measurable result',
    'Compare before you choose',
    'One action, cleaner result',
  ];

  return {
    source: 'deterministic-competitor-mcp-v1',
    sector,
    audience,
    hooks,
    keywords: ['proof', 'fast', 'trusted', 'simple', 'guarantee'],
    note: 'Replace this deterministic provider with Meta Ad Library, X trends, or approved competitor data sources later.',
  };
}

module.exports = { getCompetitorIdeas };
