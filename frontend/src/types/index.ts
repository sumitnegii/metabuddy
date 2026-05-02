export interface AdCopy {
  copyId: string; funnelStage: string; platform: string;
  headline: string; hook: string; body: string; cta: string; hashtags: string[];
}
export interface Campaign {
  _id: string; userId: string; idea: string;
  status: 'idea_pending' | 'generating' | 'ready' | 'meta_paused' | 'posted' | 'tracking';
  aiProvider?: 'claude' | 'gemini';
  selectedAgentIds?: string[];
  automationLevel?: string;
  launchConfig?: { objective?: string; websiteUrl?: string; country?: string; dailyBudget?: number; };
  metaDraft?: { campaignId?: string; createdAt?: string; status?: string; };
  ideaExpansion: { targetAudience: string[]; painPoints: string[]; marketAngle: string; usp: string[]; industry: string; competitorInsights: string; };
  strategy: { funnel: { stage: string; goal: string; kpi: string; budgetPercent: number; }[]; platforms: string[]; budgetSplit: { awareness: number; consideration: number; conversion: number; }; duration: number; totalBudgetSuggestion: string; kpiTargets: { ctr: string; cpl: string; reach: string; }; };
  content: { adCopies: AdCopy[]; hooks: string[]; headlines: string[]; };
  creative: { imageDescriptions: string[]; videoScripts: { title: string; duration: string; script: string; }[]; reelsIdeas: string[]; carouselSlides: { slideNumber: number; content: string; visual: string; }[]; colorPalette: string[]; moodDescription: string; };
  optimization: { abVariants: { original: string; variant: string; reason: string; }[]; targetingTips: string[]; budgetAdvice: string; performancePrediction: string; };
  createdAt: string; updatedAt: string;
}
export interface Ad { _id: string; campaignId: string; generatedCopyId: string; platform: string; platformAdId: string; adCopy: string; headline: string; hook: string; cta: string; status: string; postedAt?: string; latestPerformance?: PerfData; }
export interface PerfData { impressions: number; reach: number; clicks: number; ctr: number; cpc: number; spend: number; leads: number; cpl: number; conversions: number; }
export interface DashboardStats { totalCampaigns: number; totalAds: number; totalSpend: number; totalLeads: number; totalClicks: number; avgCtr: number; }

// UI Specific Types
export type Tab = "facebook" | "instagram" | "story";
export type Variant = "A" | "B" | "C";
export type AgentType = "analyze" | "scale" | "pause" | "generate" | "info";
