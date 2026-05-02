"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone, PauseCircle, PlayCircle, RefreshCw, Search, Sparkles } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { formatCurrency, formatNumber } from "@/lib/utils";

type MetaCampaign = {
  metaCampaignId: string;
  name: string;
  objective?: string;
  status?: string;
  effectiveStatus?: string;
  lastInsights?: {
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    leads?: number;
    costPerLead?: number;
  };
  lastInsightsSummary?: {
    spend?: number;
    impressions?: number;
    clicks?: number;
    ctr?: number;
    leads?: number;
    costPerLead?: number;
  };
  lastSyncedAt?: string;
};

type MetaOverview = {
  connected: boolean;
  campaigns: MetaCampaign[];
  selectedAdAccount?: { accountId: string; name?: string };
};

function statusGroup(campaign: MetaCampaign) {
  const status = campaign.effectiveStatus || campaign.status || "";
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  if (status.includes("REVIEW")) return "Review";
  return "Other";
}

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [overview, setOverview] = useState<MetaOverview>({ connected: false, campaigns: [] });

  const loadOverview = async () => {
    const data = await api.getMetaAdsV2Overview();
    setOverview(data);
  };

  useEffect(() => {
    api.getMe()
      .then(loadOverview)
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return overview.campaigns;
    return overview.campaigns.filter((campaign) =>
      [campaign.name, campaign.objective, campaign.status, campaign.effectiveStatus].filter(Boolean).join(" ").toLowerCase().includes(search)
    );
  }, [overview.campaigns, query]);

  const stageCounts = useMemo(() => {
    return filtered.reduce<Record<string, number>>((acc, campaign) => {
      const group = statusGroup(campaign);
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }, [filtered]);

  const syncMeta = async () => {
    setError("");
    setSyncing(true);
    try {
      const result = await api.syncMetaAdsV2({ datePreset: "last_30d" });
      setOverview(result.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meta sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const connectMeta = async () => {
    const { url } = await api.getMetaAdsV2OAuthUrl();
    window.location.href = url;
  };

  const changeCampaignStatus = async (campaignId: string, status: "ACTIVE" | "PAUSED") => {
    setError("");
    setBusyCampaignId(campaignId);
    try {
      const result = await api.updateMetaAdsV2CampaignStatus(campaignId, status);
      setOverview((current) => ({
        ...current,
        campaigns: current.campaigns.map((campaign) =>
          campaign.metaCampaignId === campaignId ? { ...campaign, ...result.campaign } : campaign
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not ${status === "PAUSED" ? "pause" : "resume"} campaign`);
    } finally {
      setBusyCampaignId("");
    }
  };

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1380px] animate-in">
          <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Meta campaign pipeline</p>
              <h1 className="text-[34px] font-bold tracking-tight">Your real Meta campaigns</h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                Imported from Meta Ads Manager, simplified into status, spend, clicks, leads, and improvement actions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {overview.connected ? (
                <button onClick={syncMeta} disabled={syncing} className="btn-primary">
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing" : "Sync Meta"}
                </button>
              ) : (
                <button onClick={connectMeta} className="btn-primary">
                  <Megaphone className="h-4 w-4" />
                  Connect Meta
                </button>
              )}
              <Link href="/generate" className="btn-secondary">
                <Sparkles className="h-4 w-4" />
                Create Campaign
              </Link>
            </div>
          </div>

          <section className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
            {["Active", "Paused", "Review", "Other"].map((label) => (
              <div key={label} className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-4 shadow-sm">
                <p className="text-2xl font-black">{stageCounts[label] || 0}</p>
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
              </div>
            ))}
          </section>

          {error && (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="mb-6 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-500">How to use the ad center</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                "Open a campaign to inspect imported ad sets and ads.",
                "Run campaign agents to find improvement opportunities.",
                "Generate new paused ad variants with a Page ID and website URL.",
                "Open any ad for ad-level AI analytics and approval-gated actions.",
              ].map((item, index) => (
                <div key={item} className="rounded-lg bg-zinc-50 p-4 text-sm font-semibold leading-6 text-zinc-600">
                  <span className="mb-2 block text-xs font-black text-black">Step {index + 1}</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Meta campaigns..."
                  className="w-full rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur py-2.5 pl-10 pr-4 text-sm font-medium outline-none focus:border-zinc-400"
                />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                {overview.selectedAdAccount?.name || "No ad account"} · {filtered.length} campaigns
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-zinc-500">Loading Meta campaigns...</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                <h3 className="mb-1 text-lg font-bold">{overview.connected ? "No imported campaigns found" : "Connect Meta first"}</h3>
                <p className="mb-5 text-sm text-zinc-500">Syncing imports campaigns, ad sets, ads, creatives, and performance.</p>
                {overview.connected ? <button onClick={syncMeta} className="btn-primary">Sync Meta</button> : <button onClick={connectMeta} className="btn-primary">Connect Meta</button>}
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {filtered.map((campaign) => {
                  const metrics = campaign.lastInsightsSummary || campaign.lastInsights || {};
                  const currentStatus = campaign.effectiveStatus || campaign.status || "";
                  const isActive = currentStatus === "ACTIVE";
                  const nextStatus = isActive ? "PAUSED" : "ACTIVE";
                  return (
                  <div key={campaign.metaCampaignId} className="px-6 py-5 transition-colors hover:bg-zinc-50">
                    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr_1fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-black">{campaign.name}</p>
                        <p className="mt-1 text-sm font-medium text-zinc-500">{campaign.objective || "Objective not set"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Status</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-700">{currentStatus || "Unknown"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Spend</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700">{formatCurrency(metrics.spend || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Clicks</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700">{formatNumber(metrics.clicks || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">CTR</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700">{(metrics.ctr || 0).toFixed(2)}%</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          onClick={() => changeCampaignStatus(campaign.metaCampaignId, nextStatus)}
                          disabled={busyCampaignId === campaign.metaCampaignId}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-800 disabled:opacity-50"
                        >
                          {isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          {isActive ? "Pause" : "Resume"}
                        </button>
                        <Link href={`/meta-campaign/${campaign.metaCampaignId}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white" aria-label={`Open ${campaign.name}`}>
                          <ArrowRight className="h-4 w-4 text-zinc-500" />
                        </Link>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
