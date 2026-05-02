"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, LineChart, Megaphone, RefreshCw, Sparkles, Target, TrendingUp, UserRound, Wallet } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

type MetaMetrics = {
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  leads?: number;
  costPerLead?: number;
  purchases?: number;
};

type MetaCampaign = {
  _id: string;
  metaCampaignId: string;
  name: string;
  objective?: string;
  status?: string;
  effectiveStatus?: string;
  lastInsights?: MetaMetrics;
  lastInsightsSummary?: MetaMetrics;
  lastSyncedAt?: string;
};

type MetaRecommendation = {
  _id: string;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high";
  category: string;
  campaignId?: string;
  status: string;
};

type MetaOverview = {
  connected: boolean;
  account?: { name?: string; metaUserId?: string; tokenStatus?: string; syncHealthStatus?: string };
  selectedAdAccount?: { accountId: string; name?: string; currency?: string };
  adAccounts: { accountId: string; name?: string; isSelected?: boolean }[];
  totals: MetaMetrics;
  campaigns: MetaCampaign[];
  recommendations: MetaRecommendation[];
};

const emptyOverview: MetaOverview = {
  connected: false,
  adAccounts: [],
  totals: {},
  campaigns: [],
  recommendations: [],
};

function statusTone(status?: string) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700";
  if (status === "PAUSED") return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

export default function DashboardPage() {
  const [overview, setOverview] = useState<MetaOverview>(emptyOverview);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadOverview = async () => {
    const data = await api.getMetaAdsV2Overview();
    setOverview(data);
  };

  useEffect(() => {
    api.getMe()
      .then(() => {
        loadOverview()
          .catch(err => {
            console.error("Failed to load Meta overview:", err);
            // Don't redirect to home if getMe succeeded but overview failed
            // Just let the UI show the 'not connected' state
          });
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, []);

  const activeIssues = useMemo(() => overview.recommendations.filter((item) => item.status === "pending"), [overview.recommendations]);
  const topCampaigns = useMemo(() => overview.campaigns.slice(0, 6), [overview.campaigns]);
  const metaName = overview.account?.name || overview.selectedAdAccount?.name || "";

  const connectMeta = async () => {
    setConnecting(true);
    try {
      const { url } = await api.getMetaAdsV2OAuthUrl();
      window.location.href = url;
    } finally {
      setConnecting(false);
    }
  };

  const syncMeta = async () => {
    setSyncing(true);
    try {
      const result = await api.syncMetaAdsV2({ datePreset: "last_30d" });
      setOverview(result.overview);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen app-bg text-black">
        <Sidebar />
        <main className="ml-[90px] flex flex-1 items-center justify-center p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-black" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1380px] animate-in">
          <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Meta Ads command center</p>
                {overview.connected && metaName && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-sm">
                    <UserRound className="h-3.5 w-3.5 text-zinc-500" />
                    Welcome, {metaName}
                  </div>
                )}
              </div>
              <h1 className="text-[32px] font-bold tracking-tight text-black">
                {overview.connected && metaName ? `${metaName}'s Meta Ads workspace` : "Import, analyze, improve, and launch Meta campaigns."}
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                {overview.connected
                  ? "Your campaigns, ad sets, ads, performance, and agent recommendations appear here."
                  : "Connect your Meta account once. Your campaigns, ad sets, ads, performance, and agent recommendations appear here."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {overview.connected ? (
                <button onClick={syncMeta} disabled={syncing} className="btn-primary">
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing Meta" : "Sync Meta Campaigns"}
                </button>
              ) : (
                <button onClick={connectMeta} disabled={connecting} className="btn-primary">
                  <Megaphone className="h-4 w-4" />
                  {connecting ? "Opening Meta" : "Connect Meta Account"}
                </button>
              )}
              <Link href="/generate" className="btn-secondary">
                <Sparkles className="h-4 w-4" />
                Create New Campaign
              </Link>
            </div>
          </section>

          {!overview.connected && (
            <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-4">
                  <AlertTriangle className="mt-1 h-5 w-5 text-amber-700" />
                  <div>
                    <h2 className="font-bold text-amber-950">Meta account is not connected</h2>
                    <p className="mt-1 text-sm font-medium text-amber-800">
                      After connection, this dashboard will import your real Meta campaigns and the agent can review weak campaigns before you approve changes.
                    </p>
                  </div>
                </div>
                <button onClick={connectMeta} className="btn-primary shrink-0">Connect Meta</button>
              </div>
            </section>
          )}

          <section className="mb-8 rounded-xl border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-zinc-800" />
              <h2 className="text-lg font-bold tracking-tight text-black">Quick Start Guide</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { title: "1. Connect Meta", desc: "Link your Meta Ads account to start importing your existing data." },
                { title: "2. Sync Data", desc: "Pull the latest performance metrics and campaign structures from Meta." },
                { title: "3. Review AI", desc: "Let the AI agents analyze your campaigns for improvement opportunities." },
                { title: "4. Approve Actions", desc: "Review and approve AI-suggested changes before they are applied to Meta." },
              ].map((step, idx) => (
                <div key={idx} className="relative flex flex-col gap-2 rounded-lg bg-zinc-50 p-4 transition-all hover:bg-zinc-100">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Step {idx + 1}</span>
                  <h3 className="font-bold text-black">{step.title}</h3>
                  <p className="text-xs font-medium leading-relaxed text-zinc-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {[
              { label: "Spend", value: formatCurrency(overview.totals.spend || 0), helper: "Last synced window", icon: Wallet },
              { label: "Clicks", value: formatNumber(overview.totals.clicks || 0), helper: `${formatNumber(overview.totals.impressions || 0)} impressions`, icon: Target },
              { label: "CTR", value: `${(overview.totals.ctr || 0).toFixed(2)}%`, helper: "Clicks divided by impressions", icon: TrendingUp },
              { label: "Open improvements", value: formatNumber(activeIssues.length), helper: "Need approval", icon: LineChart },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <item.icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <p className="text-2xl font-black tracking-tight">{item.value}</p>
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-zinc-500">{item.helper}</p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Imported Meta campaigns</h2>
                  <p className="text-sm font-medium text-zinc-500">
                    {overview.selectedAdAccount?.name || "No ad account selected"} · {overview.campaigns.length} campaigns
                  </p>
                </div>
                <Link href="/campaigns" className="text-sm font-bold text-zinc-600 hover:text-emerald-700">See all</Link>
              </div>

              {topCampaigns.length === 0 ? (
                <div className="p-10 text-center">
                  <Megaphone className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                  <h3 className="mb-1 text-lg font-bold">{overview.connected ? "No Meta campaigns imported yet" : "Connect Meta to import campaigns"}</h3>
                  <p className="mb-5 text-sm text-zinc-500">Sync pulls campaigns, ad sets, ads, creatives, and performance into this system.</p>
                  {overview.connected ? <button onClick={syncMeta} className="btn-primary">Sync Now</button> : <button onClick={connectMeta} className="btn-primary">Connect Meta</button>}
                </div>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {topCampaigns.map((campaign) => (
                    <Link key={campaign.metaCampaignId} href={`/meta-campaign/${campaign.metaCampaignId}`} className="flex flex-col gap-4 px-6 py-5 transition-colors hover:bg-zinc-50 md:flex-row md:items-center md:justify-between">
                      {(() => {
                        const metrics = campaign.lastInsightsSummary || campaign.lastInsights || {};
                        return (
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${statusTone(campaign.effectiveStatus || campaign.status)}`}>
                            {campaign.effectiveStatus || campaign.status || "Unknown"}
                          </span>
                          <span className="text-xs font-semibold text-zinc-400">{campaign.objective || "Objective not set"}</span>
                        </div>
                        <p className="truncate font-bold text-black">{campaign.name}</p>
                        <p className="mt-1 text-sm text-zinc-500">
                          {formatCurrency(metrics.spend || 0)} spent · {formatNumber(metrics.clicks || 0)} clicks · {(metrics.ctr || 0).toFixed(2)}% CTR
                        </p>
                      </div>
                        );
                      })()}
                      <ArrowRight className="h-4 w-4 text-zinc-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Agent improvements</h2>
                  <p className="text-sm font-medium text-zinc-500">Approve before anything changes in Meta.</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>

              {activeIssues.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center">
                  <p className="text-sm font-semibold text-zinc-600">No pending recommendations yet.</p>
                  <p className="mt-1 text-xs text-zinc-500">Open a campaign and run analysis after syncing data.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeIssues.slice(0, 5).map((item) => (
                    <Link key={item._id} href={`/meta-campaign/${item.campaignId}`} className="block rounded-lg border border-zinc-100 bg-zinc-50 p-4 hover:border-zinc-300">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">{item.category}</span>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${item.severity === "high" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-black">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-zinc-500">{item.summary}</p>
                    </Link>
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
