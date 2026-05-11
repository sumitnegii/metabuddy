import { Ad } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function tok() {
  return typeof window !== "undefined" ? localStorage.getItem("mb_token") : null;
}

async function req(path: string, opts: RequestInit = {}) {
  const t = tok();
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };

  if (t) {
    h.Authorization = `Bearer ${t}`;
  }

  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: h,
  });

  const raw = await r.text();
  let d: ReturnType<typeof JSON.parse> | null = null;
  try {
    d = raw ? JSON.parse(raw) : null;
  } catch {
    d = raw ? { error: raw } : null;
  }

  if (!r.ok) {
    const metaError = d?.metaError as { message?: string; error_user_msg?: string; error_data?: { blame_field_specs?: string[][] } } | undefined;
    const blame = metaError?.error_data?.blame_field_specs?.flat().join(", ");
    const message = [
      (d?.error as string | undefined) || metaError?.error_user_msg || metaError?.message || `Error ${r.status}`,
      blame ? `Field: ${blame}` : "",
    ].filter(Boolean).join(" ");
    throw new ApiError(message, r.status, d);
  }

  return d;
}

export const api = {
  register: (b: { name: string; email: string; password: string; company?: string }) =>
    req("/auth/register", { method: "POST", body: JSON.stringify(b) }),
  login: (b: { email: string; password: string }) =>
    req("/auth/login", { method: "POST", body: JSON.stringify(b) }),
  getMe: () => req("/auth/me"),
  completeOnboarding: (b: { company?: string; country?: string; industry?: string[]; goals?: string[] }) =>
    req("/auth/onboarding", { method: "PUT", body: JSON.stringify(b) }),
  getCampaigns: () => req("/campaigns"),
  generateIdea: (
    idea: string,
    aiProvider: string,
    options: {
      selectedAgentIds: string[];
      automationLevel?: string;
      launchConfig?: { objective?: string; websiteUrl?: string; country?: string; dailyBudget?: number };
    } = { selectedAgentIds: [] }
  ) =>
    req("/campaigns/idea", { method: "POST", body: JSON.stringify({ idea, aiProvider, ...options }) }),
  refineIdea: (id: string, feedback: string) =>
    req(`/campaigns/${id}/idea`, { method: "PUT", body: JSON.stringify({ feedback }) }),
  generateFullCampaign: (id: string) =>
    req(`/campaigns/${id}/generate`, { method: "POST", body: JSON.stringify({}) }),
  getCampaign: (id: string) => req(`/campaigns/${id}`),
  deleteCampaign: (id: string) => req(`/campaigns/${id}`, { method: "DELETE" }),
  postAd: (b: Record<string, unknown>) => req("/ads", { method: "POST", body: JSON.stringify(b) }),
  publishAd: (b: Record<string, unknown>) => req("/ads/publish", { method: "POST", body: JSON.stringify(b) }),
  linkAd: (id: string, platformAdId: string) =>
    req(`/ads/${id}/link`, { method: "PUT", body: JSON.stringify({ platformAdId }) }),
  updateAd: (id: string, b: Partial<Ad>) => req(`/ads/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  syncAd: (id: string) => req(`/ads/${id}/sync`, { method: "POST", body: JSON.stringify({}) }),
  manualPerf: (id: string, b: Record<string, unknown>) =>
    req(`/ads/${id}/manual-perf`, { method: "POST", body: JSON.stringify(b) }),
  getCampaignAds: (campaignId: string) => req(`/ads/campaign/${campaignId}`),
  getDashboardStats: () => req("/dashboard/stats"),
  getAnalytics: () => req("/dashboard/analytics"),
  getReportingTable: () => req("/dashboard/reporting-table"),
  getBestContent: () => req("/dashboard/best-content"),
  connectMeta: (b: { accessToken: string; adAccountId: string }) =>
    req("/meta/connect", { method: "POST", body: JSON.stringify(b) }),
  getMetaOAuthUrl: () => req("/meta/oauth/url"),
  getMetaStatus: () => req("/meta/status"),
  disconnectMeta: () => req("/meta/disconnect", { method: "DELETE" }),
  getAgentUsage: () => req("/agents/usage"),
  launchCampaign: (campaignId: string, pageId: string) =>
    req("/meta/launch", { method: "POST", body: JSON.stringify({ campaignId, pageId }) }),
  getAgentLogs: () => req("/agents/logs"),
  getAgentDirectory: () => req("/agents/directory"),
  hireAgent: (templateId: string) => req("/agents/hire", { method: "POST", body: JSON.stringify({ templateId }) }),
  getAgentTeam: () => req("/agents/team"),
  runAdCreativeAgents: (b: { prompt: string }) =>
    req("/agents/ad-creatives/run", { method: "POST", body: JSON.stringify(b) }),
  runAdCreativeAgentStep: (b: { step: number; data: Record<string, unknown> }) =>
    req("/agents/run-step", { method: "POST", body: JSON.stringify(b) }),
  createAdCreativePreview: (b: Record<string, unknown>) =>
    req("/ad-creative-previews", { method: "POST", body: JSON.stringify(b) }),
  createAdCreativePreviewsBulk: (b: { items: Record<string, unknown>[] }) =>
    req("/ad-creative-previews/bulk", { method: "POST", body: JSON.stringify(b) }),
  getAdCreativePreviews: (limit = 50) => req(`/ad-creative-previews?limit=${limit}`),
  getAdCreativePreview: (id: string) => req(`/ad-creative-previews/${id}`),
  publishAdCreativePreviewToMeta: (id: string, b: Record<string, unknown>) =>
    req(`/ad-creative-previews/${id}/publish-meta`, { method: "POST", body: JSON.stringify(b) }),
  createAdCreativeHistoryRun: (b: Record<string, unknown>) =>
    req("/ad-creative-history", { method: "POST", body: JSON.stringify(b) }),
  getAdCreativeHistoryRuns: (page = 1, limit = 12) => req(`/ad-creative-history?page=${page}&limit=${limit}`),
  getAdCreativeHistoryRun: (id: string) => req(`/ad-creative-history/${id}`),
  predictAdPerformance: (b: { ad_text: string; audience?: string; sector?: string; headline?: string; cta?: string }) =>
    req("/mcp/analytics/predict", { method: "POST", body: JSON.stringify(b) }),
  storeAdCreativeMemory: (b: Record<string, unknown>) =>
    req("/mcp/memory/store", { method: "POST", body: JSON.stringify(b) }),
  getAdCreativeHistory: (sector?: string, limit?: number) =>
    req(`/mcp/memory/history${sector || limit ? `?${new URLSearchParams({ ...(sector ? { sector } : {}), ...(limit ? { limit: String(limit) } : {}) }).toString()}` : ""}`),
  getMcpCostSummary: () => req("/mcp/cost/summary"),
  getCompetitorIdeas: (b: { sector?: string; audience?: string }) =>
    req("/mcp/competitor/ideas", { method: "POST", body: JSON.stringify(b) }),
  updateAgentBudget: (id: string, budgetAllocated: number) =>
    req(`/agents/${id}/budget`, { method: "PUT", body: JSON.stringify({ budgetAllocated }) }),
  updateAgentStatus: (id: string, status: "idle" | "paused") =>
    req(`/agents/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  getPendingContent: () => req("/campaigns/content/pending"),
  approveContent: (campaignId: string, copyId: string, status: "approved" | "rejected") =>
    req(`/campaigns/content/${campaignId}/copy/${copyId}`, { method: "PUT", body: JSON.stringify({ status }) }),
  getMetaAdsV2OAuthUrl: () => req("/meta-ads-v2/oauth/url"),
  getMetaAdsV2Overview: () => req("/meta-ads-v2/overview"),
  getMetaAdsV2Connections: () => req("/meta-ads-v2/connections"),
  getMetaAdsV2Diagnostics: (connectionId?: string) =>
    req(`/meta-ads-v2/diagnostics${connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : ""}`),
  disconnectMetaAdsV2Connection: (id: string, reason?: string) =>
    req(`/meta-ads-v2/connections/${id}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  getMetaAdsV2AdAccounts: () => req("/meta-ads-v2/ad-accounts"),
  updateMetaAdsV2Preference: (b: { selectedAdAccountId?: string; selectedConnectionId?: string; dashboardDatePreset?: string }) =>
    req("/meta-ads-v2/preferences", { method: "PUT", body: JSON.stringify(b) }),
  syncMetaAdsV2: (b: { accountId?: string; connectionId?: string; datePreset?: string } = {}) =>
    req("/meta-ads-v2/sync", { method: "POST", body: JSON.stringify(b) }),
  enqueueMetaAdsV2Sync: (b: { accountId?: string; connectionId?: string; datePreset?: string; jobType?: string; dateStart?: string; dateStop?: string } = {}) =>
    req("/meta-ads-v2/sync/enqueue", { method: "POST", body: JSON.stringify(b) }),
  processNextMetaAdsV2SyncJob: (workerId?: string) =>
    req("/meta-ads-v2/sync/process-next", { method: "POST", body: JSON.stringify({ workerId }) }),
  getMetaAdsV2SyncJobs: (limit?: number) => req(`/meta-ads-v2/sync/jobs${limit ? `?limit=${limit}` : ""}`),
  syncMetaAdsV2AdAccounts: () => req("/meta-ads-v2/ad-accounts/sync", { method: "POST", body: JSON.stringify({}) }),
  selectMetaAdsV2AdAccount: (accountId: string, connectionId?: string) =>
    req("/meta-ads-v2/ad-accounts/select", { method: "PUT", body: JSON.stringify({ accountId, connectionId }) }),
  getMetaAdsV2Campaign: (campaignId: string) => req(`/meta-ads-v2/campaigns/${campaignId}`),
  updateMetaAdsV2CampaignStatus: (campaignId: string, status: "ACTIVE" | "PAUSED") =>
    req(`/meta-ads-v2/campaigns/${campaignId}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  analyzeMetaAdsV2Campaign: (campaignId: string) =>
    req(`/meta-ads-v2/campaigns/${campaignId}/analyze`, { method: "POST", body: JSON.stringify({}) }),
  createMetaAdsV2AgentAd: (campaignId: string, b: { adSetId?: string; pageId: string; websiteUrl: string; direction?: string }) =>
    req(`/meta-ads-v2/campaigns/${campaignId}/agent-ad`, { method: "POST", body: JSON.stringify(b) }),
  createPausedMetaAdsV2AgentAd: (campaignId: string, b: { adSetId?: string; pageId: string; websiteUrl: string; direction?: string }) =>
    req(`/meta-ads-v2/campaigns/${campaignId}/agent-ad/create-paused`, { method: "POST", body: JSON.stringify(b) }),
  getMetaAdsV2AdSet: (adSetId: string) => req(`/meta-ads-v2/adsets/${adSetId}`),
  analyzeMetaAdsV2AdSet: (adSetId: string) =>
    req(`/meta-ads-v2/adsets/${adSetId}/analyze`, { method: "POST", body: JSON.stringify({}) }),
  getMetaAdsV2Ad: (adId: string) => req(`/meta-ads-v2/ads/${adId}`),
  getMetaAdsV2AdPreviews: (adId: string, adFormat = "DESKTOP_FEED_STANDARD") =>
    req(`/meta-ads-v2/ads/${adId}/previews?adFormat=${encodeURIComponent(adFormat)}`),
  getMetaAdsV2CreativePreviews: (creativeId: string, adFormat = "DESKTOP_FEED_STANDARD") =>
    req(`/meta-ads-v2/ad-creatives/${creativeId}/previews?adFormat=${encodeURIComponent(adFormat)}`),
  analyzeMetaAdsV2Ad: (adId: string) =>
    req(`/meta-ads-v2/ads/${adId}/analyze`, { method: "POST", body: JSON.stringify({}) }),
  applyMetaAdsV2Recommendation: (id: string) =>
    req(`/meta-ads-v2/recommendations/${id}/apply`, { method: "POST", body: JSON.stringify({}) }),
  rejectMetaAdsV2Recommendation: (id: string) =>
    req(`/meta-ads-v2/recommendations/${id}/reject`, { method: "POST", body: JSON.stringify({}) }),
  createMetaAdsV2Campaign: (b: { name?: string; objective?: string; idea?: string; campaignId?: string }) =>
    req("/meta-ads-v2/campaigns/create", { method: "POST", body: JSON.stringify(b) }),
  uploadMetaAdsV2AdImageUrl: (b: { imageUrl: string; accountId?: string; connectionId?: string }) =>
    req("/meta-ads-v2/ad-images/upload-url", { method: "POST", body: JSON.stringify(b) }),
  uploadMetaAdsV2AdVideoUrl: (b: { videoUrl: string; accountId?: string; connectionId?: string }) =>
    req("/meta-ads-v2/ad-videos/upload-url", { method: "POST", body: JSON.stringify(b) }),
  createFullMetaAdsV2Campaign: (b: {
    adType?: "IMAGE" | "VIDEO" | "CAROUSEL" | "EXISTING_POST" | "image" | "video" | "carousel";
    campaignName: string;
    objective?: string;
    dailyBudget?: number;
    dailyBudgetMinor?: number;
    country?: string;
    ageMin?: number;
    ageMax?: number;
    pageId?: string;
    imageUrl?: string;
    imageHash?: string;
    videoUrl?: string;
    videoId?: string;
    carouselCards?: Array<{
      link?: string;
      imageUrl?: string;
      imageHash?: string;
      name?: string;
      headline?: string;
      description?: string;
    }>;
    primaryText: string;
    headline: string;
    description?: string;
    callToActionType?: string;
    websiteUrl: string;
    existingPostId?: string;
  }) => req("/meta-ads-v2/campaigns/create-full", { method: "POST", body: JSON.stringify(b) }),
  createCampaignDraft: (b: {
    title?: string;
    brief: string;
    selectedAgentIds: string[];
    aiProvider?: "claude" | "gemini";
    automationLevel?: string;
    launchConfig?: {
      objective?: string;
      websiteUrl?: string;
      pageId?: string;
      country?: string;
      dailyBudget?: number;
      dailyBudgetMinor?: number;
    };
  }) => req("/campaign-drafts", { method: "POST", body: JSON.stringify(b) }),
  getCampaignDraft: (id: string) => req(`/campaign-drafts/${id}`),
  runCampaignDraftAgents: (id: string) => req(`/campaign-drafts/${id}/run-agents`, { method: "POST", body: JSON.stringify({}) }),
  approveCampaignDraft: (id: string) => req(`/campaign-drafts/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  rejectCampaignDraft: (id: string) => req(`/campaign-drafts/${id}/reject`, { method: "POST", body: JSON.stringify({}) }),
  publishCampaignDraftToMeta: (id: string) => req(`/campaign-drafts/${id}/publish-meta`, { method: "POST", body: JSON.stringify({}) }),
};
