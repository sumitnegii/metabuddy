import { AgentType } from "./constants";

export interface AgentAction {
  type: AgentType;
  text: string;
}

const ANALYZING_LOGS = [
  "Analyzing target audience 'Entrepreneurs'...",
  "Fetching historical CTR for similar niche...",
  "Scanning competitor ad structures...",
  "Optimizing for lowest CPC in Tier 1 countries...",
];

const GENERATING_LOGS = [
  "Drafting high-converting hooks...",
  "Generating multi-platform creatives...",
  "A/B testing headline variations...",
  "Polishing ad copy for 'Magic' feel...",
];

const LIVE_AGENT_LOGS: AgentAction[] = [
  { type: "analyze",  text: "Launched campaign 'Course Launch v1' on Meta." },
  { type: "scale",    text: "Ad 'Variation B' hitting 4.2% CTR. Increasing budget by 20%." },
  { type: "pause",    text: "Paused 'Variation A' due to low engagement (0.8% CTR)." },
  { type: "generate", text: "Generated new improved hook based on winning patterns." },
  { type: "analyze",  text: "Collecting metrics for next optimization cycle..." },
  { type: "scale",    text: "Scaling 'Winner Ad' — ROAS currently at 3.5x." },
  { type: "info",     text: "System healthy. Ad account synced with Meta API." },
];

export function getMockInitialLogs(): AgentAction[] {
  return [
    { type: "info", text: "MetaBuddy Engine initialized." },
    { type: "analyze", text: "Ready to analyze your idea..." },
  ];
}

export function getRandomLiveLog(): AgentAction {
  return LIVE_AGENT_LOGS[Math.floor(Math.random() * LIVE_AGENT_LOGS.length)];
}

export function getAnalyzingSteps() { return ANALYZING_LOGS; }
export function getGeneratingSteps() { return GENERATING_LOGS; }
