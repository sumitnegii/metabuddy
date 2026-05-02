"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Megaphone, PauseCircle, RefreshCw, Sparkles, Target, ThumbsDown, TrendingUp, Wallet, XCircle } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Metrics = {
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  leads?: number;
  costPerLead?: number;
};

type MetaAdSet = {
  metaAdSetId: string;
  metaCampaignId: string;
  name: string;
  effectiveStatus?: string;
  status?: string;
  optimizationGoal?: string;
  billingEvent?: string;
  bidStrategy?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  targeting?: Record<string, unknown>;
  lastInsights?: Metrics;
};

type MetaAd = {
  metaAdId: string;
  name: string;
  effectiveStatus?: string;
  headline?: string;
  body?: string;
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
  status: "pending" | "approved" | "applied" | "rejected" | "failed";
};

type Detail = {
  adSet: MetaAdSet;
  campaign?: { metaCampaignId: string; name: string; objective?: string };
  ads: MetaAd[];
  recommendations: Recommendation[];
  actionLogs: { _id: string; actionType: string; status: string; error?: string; createdAt?: string }[];
  dailyInsights: { date: string; metrics: Metrics }[];
};

function severityClass(severity: Recommendation["severity"]) {
  if (severity === "high") return "bg-red-50 text-red-700 border-red-100";
  if (severity === "medium") return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-zinc-50 text-zinc-600 border-zinc-100";
}

export default function MetaAdSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [busyId, setBusyId] = useState("");

  const loadDetail = useCallback(async () => {
    const data = await api.getMetaAdsV2AdSet(id);
    setDetail(data);
  }, [id]);

  useEffect(() => {
    api.getMe()
      .then(loadDetail)
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, [loadDetail]);

  const pendingRecommendations = useMemo(() => detail?.recommendations.filter((item) => item.status === "pending") || [], [detail]);
  const sortedAds = useMemo(() => [...(detail?.ads || [])].sort((a, b) => (b.lastInsights?.spend || 0) - (a.lastInsights?.spend || 0)), [detail]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.analyzeMetaAdsV2AdSet(id);
      await loadDetail();
    } finally {
      setAnalyzing(false);
    }
  };

  const applyRecommendation = async (recommendationId: string) => {
    setBusyId(recommendationId);
    try {
      await api.applyMetaAdsV2Recommendation(recommendationId);
      await loadDetail();
    } finally {
      setBusyId("");
    }
  };

  const rejectRecommendation = async (recommendationId: string) => {
    setBusyId(recommendationId);
    try {
      await api.rejectMetaAdsV2Recommendation(recommendationId);
      await loadDetail();
    } finally {
      setBusyId("");
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

  const metrics = detail.adSet.lastInsights || {};

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1380px] animate-in">
          <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <Link href={`/meta-campaign/${detail.adSet.metaCampaignId}`} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-emerald-700">
                <ArrowLeft className="h-4 w-4" />
                Back to campaign
              </Link>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-600">
                  {detail.adSet.effectiveStatus || detail.adSet.status || "Unknown"}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{detail.adSet.optimizationGoal || "Ad set"}</span>
              </div>
              <h1 className="truncate text-[34px] font-bold tracking-tight">{detail.adSet.name}</h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                Ad set command view for budget, delivery, targeting, contained ads, and AI recommendations.
              </p>
            </div>
            <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
              <Sparkles className="h-4 w-4" />
              {analyzing ? "Analyzing" : "Analyze Ad Set"}
            </button>
          </header>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
            {[
              { label: "Spend", value: formatCurrency(metrics.spend || 0), icon: Wallet },
              { label: "Clicks", value: formatNumber(metrics.clicks || 0), icon: Target },
              { label: "CTR", value: `${(metrics.ctr || 0).toFixed(2)}%`, icon: TrendingUp },
              { label: "Impressions", value: formatNumber(metrics.impressions || 0), icon: Megaphone },
              { label: "Daily budget", value: detail.adSet.dailyBudget ? formatCurrency((detail.adSet.dailyBudget || 0) / 100) : "Not set", icon: RefreshCw },
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

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                <h2 className="mb-1 text-xl font-bold tracking-tight">Ads in this ad set</h2>
                <p className="mb-5 text-sm font-medium text-zinc-500">{sortedAds.length} imported ads</p>
                {sortedAds.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                    No ads imported inside this ad set.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedAds.map((ad) => (
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

              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                <h2 className="mb-4 text-xl font-bold tracking-tight">Delivery setup</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ["Billing event", detail.adSet.billingEvent || "Not imported"],
                    ["Bid strategy", detail.adSet.bidStrategy || "Not imported"],
                    ["Optimization", detail.adSet.optimizationGoal || "Not imported"],
                    ["Lifetime budget", detail.adSet.lifetimeBudget ? formatCurrency((detail.adSet.lifetimeBudget || 0) / 100) : "Not set"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-zinc-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p>
                      <p className="mt-1 text-sm font-bold text-black">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">AI ad set analytics</h2>
                  <p className="text-sm font-medium text-zinc-500">{pendingRecommendations.length} pending approval</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>

              {detail.recommendations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
                  <h3 className="font-bold">No ad set analysis yet</h3>
                  <p className="mt-1 text-sm text-zinc-500">Run analysis to get audience, structure, and delivery recommendations.</p>
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
                      {item.expectedImpact && <p className="mt-2 text-xs font-semibold text-emerald-700">{item.expectedImpact}</p>}
                      {item.status === "pending" && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button onClick={() => applyRecommendation(item._id)} disabled={busyId === item._id} className="inline-flex h-10 items-center gap-2 rounded-full bg-black px-4 text-sm font-bold text-white disabled:opacity-50">
                            {item.suggestedAction === "pause" ? <PauseCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            Approve
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
          </section>
        </div>
      </main>
    </div>
  );
}
