"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Megaphone, PauseCircle, PlayCircle, Plus, RefreshCw, Sparkles, Target, ThumbsDown, TrendingUp, Wallet, XCircle } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Metrics = {
  spend?: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  leads?: number;
  purchases?: number;
  costPerLead?: number;
  roas?: number;
};

type MetaCampaign = {
  metaCampaignId: string;
  name: string;
  objective?: string;
  status?: string;
  effectiveStatus?: string;
  lastInsights?: Metrics;
  lastInsightsSummary?: Metrics;
  lastInsightsDate?: string;
};

type MetaAdSet = {
  metaAdSetId: string;
  name: string;
  effectiveStatus?: string;
  optimizationGoal?: string;
  dailyBudget?: number;
  lastInsights?: Metrics;
};

type MetaAd = {
  metaAdId: string;
  name: string;
  effectiveStatus?: string;
  headline?: string;
  body?: string;
  callToActionType?: string;
  imageUrl?: string;
  lastInsights?: Metrics;
};

type Recommendation = {
  _id: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  category: string;
  suggestedAction: string;
  expectedImpact?: string;
  status: "pending" | "approved" | "applied" | "rejected";
  actionPayload?: {
    headline?: string;
    body?: string;
    adSetId?: string;
    websiteUrl?: string;
  };
};

type CampaignDetail = {
  campaign: MetaCampaign;
  adSets: MetaAdSet[];
  ads: MetaAd[];
  recommendations: Recommendation[];
  actionLogs?: { _id: string; actionType: string; status: string; error?: string; createdAt?: string }[];
  latestAgentReport?: {
    generatedAt?: string;
    healthScore?: number;
    summary?: string;
    agents?: { name: string; status: string; finding: string; recommendation: string }[];
    nextActions?: { title: string; action: string; severity: string; entityType: string }[];
  } | null;
};

function severityClass(severity: Recommendation["severity"]) {
  if (severity === "high") return "bg-red-50 text-red-700 border-red-100";
  if (severity === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-zinc-50 text-zinc-600 border-zinc-100";
}

export default function MetaCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [creatingAd, setCreatingAd] = useState(false);
  const [publishingAd, setPublishingAd] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [adForm, setAdForm] = useState({ pageId: "", websiteUrl: "", adSetId: "", direction: "" });

  const loadDetail = useCallback(async () => {
    const data = await api.getMetaAdsV2Campaign(id);
    setDetail(data);
  }, [id]);

  useEffect(() => {
    api.getMe()
      .then(loadDetail)
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, [id, loadDetail]);

  const pendingRecommendations = useMemo(() => detail?.recommendations.filter((item) => item.status === "pending") || [], [detail]);
  const sortedAds = useMemo(() => [...(detail?.ads || [])].sort((a, b) => (b.lastInsights?.spend || 0) - (a.lastInsights?.spend || 0)), [detail]);
  const createAdRecommendations = useMemo(
    () => pendingRecommendations.filter((item) => item.suggestedAction === "create_ad"),
    [pendingRecommendations]
  );
  const agentReport = detail?.latestAgentReport;

  const runAnalysis = async () => {
    setError("");
    setAnalyzing(true);
    try {
      await api.analyzeMetaAdsV2Campaign(id);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const applyRecommendation = async (recommendationId: string) => {
    setError("");
    setBusyId(recommendationId);
    try {
      await api.applyMetaAdsV2Recommendation(recommendationId);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply this recommendation");
    } finally {
      setBusyId("");
    }
  };

  const rejectRecommendation = async (recommendationId: string) => {
    setError("");
    setBusyId(recommendationId);
    try {
      await api.rejectMetaAdsV2Recommendation(recommendationId);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject this recommendation");
    } finally {
      setBusyId("");
    }
  };

  const createAgentAd = async () => {
    setError("");
    setCreatingAd(true);
    try {
      await api.createMetaAdsV2AgentAd(id, {
        pageId: adForm.pageId,
        websiteUrl: adForm.websiteUrl,
        adSetId: adForm.adSetId || detail?.adSets[0]?.metaAdSetId,
        direction: adForm.direction,
      });
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the agent ad recommendation");
    } finally {
      setCreatingAd(false);
    }
  };

  const createPausedAdNow = async () => {
    setError("");
    setPublishingAd(true);
    try {
      const result = await api.createPausedMetaAdsV2AgentAd(id, {
        pageId: adForm.pageId,
        websiteUrl: adForm.websiteUrl,
        adSetId: adForm.adSetId || detail?.adSets[0]?.metaAdSetId,
        direction: adForm.direction,
      });
      setDetail(result.detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the paused ad in Meta");
    } finally {
      setPublishingAd(false);
    }
  };

  const changeCampaignStatus = async (status: "ACTIVE" | "PAUSED") => {
    setError("");
    setStatusBusy(true);
    try {
      const result = await api.updateMetaAdsV2CampaignStatus(id, status);
      setDetail((current) => current ? { ...current, campaign: { ...current.campaign, ...result.campaign } } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${status === "PAUSED" ? "pause" : "resume"} campaign`);
    } finally {
      setStatusBusy(false);
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex min-h-screen app-bg text-black">
        <Sidebar />
        <main className="ml-[90px] flex flex-1 items-center justify-center p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-black" />
        </main>
      </div>
    );
  }

  const metrics = detail.campaign.lastInsightsSummary || detail.campaign.lastInsights || {};
  const currentStatus = detail.campaign.effectiveStatus || detail.campaign.status || "";
  const isActive = currentStatus === "ACTIVE";

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1380px] animate-in">
          <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link href="/campaigns" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-emerald-700">
                <ArrowLeft className="h-4 w-4" />
                Back to campaigns
              </Link>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-600">
                  {currentStatus || "Unknown"}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{detail.campaign.objective || "Meta campaign"}</span>
              </div>
              <h1 className="truncate text-[34px] font-bold tracking-tight">{detail.campaign.name}</h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                Agent analysis finds campaign improvement opportunities. Nothing is changed in Meta until you approve an action.
              </p>
              <div className="mt-6 rounded-xl border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-800" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-800">Campaign Optimization Guide</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { step: "Sync Data", desc: "Import current Meta performance data to ensure the AI has the latest context." },
                    { step: "Run Agents", desc: "Let specialized AI agents scan your campaign for creative and delivery issues." },
                    { step: "Approve Work", desc: "Review suggestions and approve the ones you want to apply to Meta." }
                  ].map((item, idx) => (
                    <div key={idx} className="rounded-lg bg-zinc-50 p-4">
                      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Step {idx + 1}</p>
                      <p className="font-bold text-black">{item.step}</p>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <button
                onClick={() => changeCampaignStatus(isActive ? "PAUSED" : "ACTIVE")}
                disabled={statusBusy}
                className="btn-secondary"
              >
                {isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {statusBusy ? "Updating" : isActive ? "Pause Campaign" : "Resume Campaign"}
              </button>
              <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
                <Sparkles className="h-4 w-4" />
                {analyzing ? "Analyzing" : "Analyze Campaign"}
              </button>
            </div>
          </header>

          {error && (
            <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            {[
              { label: "Spend", value: formatCurrency(metrics.spend || 0), icon: Wallet },
              { label: "Impressions", value: formatNumber(metrics.impressions || 0), icon: Megaphone },
              { label: "Clicks", value: formatNumber(metrics.clicks || 0), icon: Target },
              { label: "CTR", value: `${(metrics.ctr || 0).toFixed(2)}%`, icon: TrendingUp },
              { label: "Cost / lead", value: metrics.costPerLead ? formatCurrency(metrics.costPerLead) : "No leads", icon: RefreshCw },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-5 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                  <item.icon className="h-5 w-5 text-zinc-700" />
                </div>
                <p className="text-2xl font-black">{item.value}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
              </div>
            ))}
          </section>

          <section className="mb-6 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Agent command center</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  Run real agents on imported Meta data, create paused ads in Meta, then resume only after review.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={runAnalysis} disabled={analyzing} className="btn-secondary">
                  <Sparkles className="h-4 w-4" />
                  {analyzing ? "Agents running" : "Run audit agents"}
                </button>
                <button
                  onClick={createPausedAdNow}
                  disabled={publishingAd || !adForm.websiteUrl || !adForm.pageId || detail.adSets.length === 0}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4" />
                  {publishingAd ? "Creating in Meta" : "Create paused ad in Meta"}
                </button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {(agentReport?.agents || [
                { name: "Performance Auditor", status: "ready", finding: "Reads spend, CTR, clicks, leads", recommendation: "Run audit agents to generate findings." },
                { name: "Creative Strategist", status: "ready", finding: "Finds weak hooks and new angles", recommendation: "Run audit agents to generate findings." },
                { name: "Audience Analyst", status: "ready", finding: "Checks ad set delivery and audience fit", recommendation: "Run audit agents to generate findings." },
                { name: "Launch Controller", status: "ready", finding: "Creates paused ads and logs actions", recommendation: "Run audit agents to generate findings." },
              ]).map((agent) => (
                <div key={agent.name} className="rounded-lg bg-zinc-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-black">{agent.name}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-5 text-zinc-600">{agent.finding}</p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-emerald-700">{agent.recommendation}</p>
                </div>
              ))}
            </div>
            {agentReport && (
              <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Latest agent report</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-700">{agentReport.summary}</p>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-3 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Health score</p>
                    <p className="text-2xl font-black text-black">{agentReport.healthScore ?? 0}</p>
                  </div>
                </div>
                {(agentReport.nextActions?.length || 0) > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {agentReport.nextActions?.map((action) => (
                      <div key={`${action.entityType}-${action.title}`} className="rounded-lg bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{action.severity} · {action.action}</p>
                        <p className="mt-1 text-sm font-bold text-black">{action.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(detail.actionLogs?.length || 0) > 0 && (
              <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Recent Meta actions</p>
                <div className="grid gap-2 md:grid-cols-3">
                  {detail.actionLogs?.slice(0, 3).map((log) => (
                    <div key={log._id} className="rounded-lg bg-white p-3 text-xs font-semibold text-zinc-600">
                      <p className="font-bold text-black">{log.actionType.replaceAll("_", " ")}</p>
                      <p className={log.status === "failed" ? "mt-1 text-red-600" : "mt-1 text-emerald-700"}>{log.status}</p>
                      {log.error && <p className="mt-1 line-clamp-2 text-red-600">{log.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Agent recommendations</h2>
                  <p className="text-sm font-medium text-zinc-500">{pendingRecommendations.length} pending approval</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>

              {detail.recommendations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
                  <h3 className="font-bold">No analysis yet</h3>
                  <p className="mt-1 text-sm text-zinc-500">Run analysis to get plain-English improvement suggestions.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detail.recommendations.map((item) => (
                    <div key={item._id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${severityClass(item.severity)}`}>
                          {item.severity} · {item.category}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{item.status}</span>
                      </div>
                      <h3 className="font-bold text-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-relaxed text-zinc-600">{item.summary}</p>
                      {item.suggestedAction === "create_ad" && item.actionPayload && (
                        <div className="mt-3 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur p-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-400">Proposed ad</p>
                          <p className="mt-2 text-sm font-bold text-black">{item.actionPayload.headline}</p>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-600">{item.actionPayload.body}</p>
                        </div>
                      )}
                      {item.expectedImpact && <p className="mt-2 text-xs font-semibold text-emerald-700">{item.expectedImpact}</p>}

                      {item.status === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => applyRecommendation(item._id)} disabled={busyId === item._id} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#F9734F] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(249,115,79,0.22)] hover:bg-[#EF6542] disabled:opacity-50">
                            {item.suggestedAction === "pause" ? <PauseCircle className="h-4 w-4" /> : item.suggestedAction === "create_ad" ? <Plus className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {item.suggestedAction === "create_ad" ? "Approve & create paused ad" : "Approve"}
                          </button>
                          <button onClick={() => rejectRecommendation(item._id)} disabled={busyId === item._id} className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 disabled:opacity-50">
                            <ThumbsDown className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Ads inside this campaign</h2>
                  <p className="mt-1 text-sm font-medium text-zinc-500">View current ads, then let an agent create a paused variant for approval.</p>
                </div>
              </div>

              <div className="mb-6 rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-zinc-700" />
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-zinc-700">Create ad with agent</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={adForm.websiteUrl}
                    onChange={(event) => setAdForm((current) => ({ ...current, websiteUrl: event.target.value }))}
                    placeholder="Website URL"
                    className="h-11 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                  <input
                    value={adForm.pageId}
                    onChange={(event) => setAdForm((current) => ({ ...current, pageId: event.target.value }))}
                    placeholder="Meta Page ID"
                    className="h-11 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                  <select
                    value={adForm.adSetId}
                    onChange={(event) => setAdForm((current) => ({ ...current, adSetId: event.target.value }))}
                    className="h-11 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  >
                    <option value="">Use top ad set</option>
                    {detail.adSets.map((adSet) => (
                      <option key={adSet.metaAdSetId} value={adSet.metaAdSetId}>{adSet.name}</option>
                    ))}
                  </select>
                  <input
                    value={adForm.direction}
                    onChange={(event) => setAdForm((current) => ({ ...current, direction: event.target.value }))}
                    placeholder="Direction, e.g. stronger offer for parents"
                    className="h-11 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-3 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                  />
                </div>
                <button
                  onClick={createAgentAd}
                  disabled={creatingAd || !adForm.websiteUrl || !adForm.pageId || detail.adSets.length === 0}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {creatingAd ? "Creating recommendation" : "Generate for approval"}
                </button>
                <button
                  onClick={createPausedAdNow}
                  disabled={publishingAd || !adForm.websiteUrl || !adForm.pageId || detail.adSets.length === 0}
                  className="ml-2 mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#F9734F] px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(249,115,79,0.22)] hover:bg-[#EF6542] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {publishingAd ? "Posting paused ad" : "Create paused ad in Meta now"}
                </button>
                {createAdRecommendations.length > 0 && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700">
                    {createAdRecommendations.length} ad recommendation pending. Click approve to create it in Meta.
                  </p>
                )}
              </div>

              {sortedAds.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                  <p className="text-sm font-semibold text-zinc-600">No ads imported for this campaign.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedAds.slice(0, 8).map((ad) => (
                    <Link key={ad.metaAdId} href={`/meta-ad/${ad.metaAdId}`} className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-white md:grid-cols-[1.2fr_0.8fr]">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          {ad.effectiveStatus === "ACTIVE" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-zinc-400" />}
                          <p className="truncate text-sm font-bold text-black">{ad.name}</p>
                        </div>
                        <p className="line-clamp-2 text-xs font-medium leading-relaxed text-zinc-500">{ad.headline || ad.body || "Creative text not available from Meta"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-right">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Spend</p>
                          <p className="mt-1 text-sm font-bold">{formatCurrency(ad.lastInsights?.spend || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">CTR</p>
                          <p className="mt-1 text-sm font-bold">{(ad.lastInsights?.ctr || 0).toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Clicks</p>
                          <p className="mt-1 text-sm font-bold">{formatNumber(ad.lastInsights?.clicks || 0)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold tracking-tight">Ad sets</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detail.adSets.map((adSet) => (
                <Link key={adSet.metaAdSetId} href={`/meta-adset/${adSet.metaAdSetId}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-white">
                  <p className="font-bold text-black">{adSet.name}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{adSet.effectiveStatus || "Unknown"} · {adSet.optimizationGoal || "Goal not set"}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-400">Spend</p>
                      <p className="mt-1 text-sm font-bold">{formatCurrency(adSet.lastInsights?.spend || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-400">Clicks</p>
                      <p className="mt-1 text-sm font-bold">{formatNumber(adSet.lastInsights?.clicks || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-400">CTR</p>
                      <p className="mt-1 text-sm font-bold">{(adSet.lastInsights?.ctr || 0).toFixed(2)}%</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
