"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Megaphone,
  MousePointerClick,
  PauseCircle,
  Percent,
  PlayCircle,
  RefreshCw,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { ApiError, api } from "@/lib/api";
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

const STATUS_FILTERS = ["All", "Active", "Paused", "Review", "Other"];

function statusGroup(campaign: MetaCampaign) {
  const status = campaign.effectiveStatus || campaign.status || "";
  if (status === "ACTIVE") return "Active";
  if (status === "PAUSED") return "Paused";
  if (status.includes("REVIEW")) return "Review";
  return "Other";
}

function statusTone(status: string) {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "PAUSED") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status.includes("REVIEW")) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}

function timeAgo(value?: string) {
  if (!value) return "Never synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sync time unavailable";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [busyCampaignId, setBusyCampaignId] = useState("");
  const [error, setError] = useState("");
  const [reconnectRequired, setReconnectRequired] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [overview, setOverview] = useState<MetaOverview>({ connected: false, campaigns: [] });

  const loadOverview = async () => {
    const data = await api.getMetaAdsV2Overview();
    setOverview(data);
    if (!data.connected) setReconnectRequired(false);
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
    return overview.campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === "All" || statusGroup(campaign) === statusFilter;
      const matchesSearch = !search || [campaign.name, campaign.objective, campaign.status, campaign.effectiveStatus].filter(Boolean).join(" ").toLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [overview.campaigns, query, statusFilter]);

  const stageCounts = useMemo(() => {
    return overview.campaigns.reduce<Record<string, number>>((acc, campaign) => {
      const group = statusGroup(campaign);
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }, [overview.campaigns]);

  const totals = useMemo(() => {
    return overview.campaigns.reduce(
      (acc, campaign) => {
        const metrics = campaign.lastInsightsSummary || campaign.lastInsights || {};
        acc.spend += metrics.spend || 0;
        acc.impressions += metrics.impressions || 0;
        acc.clicks += metrics.clicks || 0;
        acc.leads += metrics.leads || 0;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, leads: 0 }
    );
  }, [overview.campaigns]);

  const blendedCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const latestSync = useMemo(() => {
    return overview.campaigns
      .map((campaign) => campaign.lastSyncedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
  }, [overview.campaigns]);

  const syncMeta = async () => {
    setError("");
    setReconnectRequired(false);
    setSyncing(true);
    try {
      const result = await api.syncMetaAdsV2({ datePreset: "last_30d" });
      setOverview(result.overview);
    } catch (err) {
      const shouldReconnect = err instanceof ApiError && Boolean((err.details as { reconnectRequired?: boolean } | undefined)?.reconnectRequired);
      setReconnectRequired(shouldReconnect);
      setError(err instanceof Error ? err.message : "Meta sync failed");
      if (shouldReconnect) {
        loadOverview().catch(() => undefined);
      }
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
    setReconnectRequired(false);
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
      const shouldReconnect = err instanceof ApiError && (err.status === 401 || Boolean((err.details as { reconnectRequired?: boolean } | undefined)?.reconnectRequired));
      setReconnectRequired(shouldReconnect);
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
          <div className="mb-6 flex flex-col gap-5 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Campaign operations</p>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${overview.connected ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                  {overview.connected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {overview.connected ? "Meta connected" : "Meta not connected"}
                </span>
              </div>
              <h1 className="text-[34px] font-black tracking-tight">Meta campaigns workspace</h1>
              <p className="mt-2 max-w-3xl text-[15px] font-semibold leading-6 text-zinc-500">
                Monitor imported campaigns, compare delivery, and take controlled status actions from one focused view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {overview.connected && !reconnectRequired ? (
                <button onClick={syncMeta} disabled={syncing} className="btn-primary">
                  <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing" : "Sync Meta"}
                </button>
              ) : (
                <button onClick={connectMeta} className="btn-primary">
                  <Megaphone className="h-4 w-4" />
                  {reconnectRequired ? "Reconnect Meta" : "Connect Meta"}
                </button>
              )}
              <Link href="/generate" className="btn-secondary">
                <Sparkles className="h-4 w-4" />
                New Campaign
              </Link>
            </div>
          </div>

          {reconnectRequired ? (
            <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <h2 className="font-black text-amber-950">Meta session expired</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">
                      Facebook invalidated the saved access token after a password or security change. Reconnect Meta to continue syncing and changing campaign status.
                    </p>
                    {error && <p className="mt-2 text-xs font-bold text-amber-700">{error}</p>}
                  </div>
                </div>
                <button onClick={connectMeta} className="btn-primary shrink-0">Reconnect Meta</button>
              </div>
            </section>
          ) : error && (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!overview.connected && (
            <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <h2 className="font-black text-amber-950">Connect Meta to import campaign data</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-amber-800">Campaigns, ad sets, ads, and performance metrics will populate this workspace after the first sync.</p>
                  </div>
                </div>
                <button onClick={connectMeta} className="btn-primary shrink-0">Connect Meta</button>
              </div>
            </section>
          )}

          <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {[
              { label: "Spend", value: formatCurrency(totals.spend), helper: "Imported reporting window", icon: Wallet },
              { label: "Clicks", value: formatNumber(totals.clicks), helper: `${formatNumber(totals.impressions)} impressions`, icon: MousePointerClick },
              { label: "CTR", value: `${blendedCtr.toFixed(2)}%`, helper: "Blended campaign average", icon: Percent },
              { label: "Campaigns", value: formatNumber(overview.campaigns.length), helper: `Last sync ${timeAgo(latestSync)}`, icon: BarChart3 },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">{item.label}</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-50 text-zinc-700">
                    <item.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black tracking-tight">{item.value}</p>
                <p className="mt-2 text-xs font-semibold text-zinc-500">{item.helper}</p>
              </div>
            ))}
          </section>

          <section className="mb-6 rounded-lg border border-zinc-200 bg-white/90 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((label) => {
                  const count = label === "All" ? overview.campaigns.length : stageCounts[label] || 0;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setStatusFilter(label)}
                      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-black transition-all ${statusFilter === label ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"}`}
                    >
                      {label}
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusFilter === label ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="relative w-full lg:w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by campaign, objective, or status"
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-zinc-400"
                />
              </div>
            </div>
          </section>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 border-b border-zinc-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-black">Campaign delivery</h2>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  {overview.selectedAdAccount?.name || "No ad account selected"} · {filtered.length} shown
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
                <Clock3 className="h-4 w-4" />
                {timeAgo(latestSync)}
              </div>
            </div>

            {loading ? (
              <div className="flex h-72 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-black" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Megaphone className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                <h3 className="mb-1 text-lg font-bold">{overview.connected ? "No imported campaigns found" : "Connect Meta first"}</h3>
                <p className="mb-5 text-sm text-zinc-500">Syncing imports campaigns, ad sets, ads, creatives, and performance.</p>
                {overview.connected ? <button onClick={syncMeta} className="btn-primary">Sync Meta</button> : <button onClick={connectMeta} className="btn-primary">Connect Meta</button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[1040px] grid-cols-[minmax(300px,1.5fr)_150px_120px_120px_120px_120px_170px] border-b border-zinc-100 bg-zinc-50 px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
                  <span>Campaign</span>
                  <span>Status</span>
                  <span>Spend</span>
                  <span>Impressions</span>
                  <span>Clicks</span>
                  <span>CTR</span>
                  <span className="text-right">Actions</span>
                </div>
                {filtered.map((campaign) => {
                  const metrics = campaign.lastInsightsSummary || campaign.lastInsights || {};
                  const currentStatus = campaign.effectiveStatus || campaign.status || "";
                  const isActive = currentStatus === "ACTIVE";
                  const nextStatus = isActive ? "PAUSED" : "ACTIVE";
                  return (
                    <div key={campaign.metaCampaignId} className="grid min-w-[1040px] grid-cols-[minmax(300px,1.5fr)_150px_120px_120px_120px_120px_170px] items-center border-b border-zinc-100 px-6 py-4 last:border-b-0 hover:bg-zinc-50">
                      <div className="min-w-0 pr-6">
                        <Link href={`/meta-campaign/${campaign.metaCampaignId}`} className="truncate text-sm font-black text-zinc-950 hover:text-orange-600">
                          {campaign.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-500">
                          <span>{campaign.objective || "Objective not set"}</span>
                          <span className="h-1 w-1 rounded-full bg-zinc-300" />
                          <span>{timeAgo(campaign.lastSyncedAt)}</span>
                        </div>
                      </div>
                      <div>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${statusTone(currentStatus)}`}>{currentStatus || "Unknown"}</span>
                      </div>
                      <p className="text-sm font-black text-zinc-800">{formatCurrency(metrics.spend || 0)}</p>
                      <p className="text-sm font-semibold text-zinc-700">{formatNumber(metrics.impressions || 0)}</p>
                      <p className="text-sm font-semibold text-zinc-700">{formatNumber(metrics.clicks || 0)}</p>
                      <p className="text-sm font-semibold text-zinc-700">{(metrics.ctr || 0).toFixed(2)}%</p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => changeCampaignStatus(campaign.metaCampaignId, nextStatus)}
                          disabled={busyCampaignId === campaign.metaCampaignId}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-800 shadow-sm disabled:opacity-50"
                        >
                          {isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                          {isActive ? "Pause" : "Resume"}
                        </button>
                        <Link href={`/meta-campaign/${campaign.metaCampaignId}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm" aria-label={`Open ${campaign.name}`}>
                          <ArrowRight className="h-4 w-4 text-zinc-500" />
                        </Link>
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
