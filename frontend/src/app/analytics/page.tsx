"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Cpu, Download, Filter, MousePointer2, Target, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";

type AnalyticsResponse = {
  totalCampaigns: number;
  totalAds: number;
  totals: { spend: number; leads: number; clicks: number; impressions: number; reach: number; conversions: number };
  derived: { ctr: number; cpc: number; cpl: number };
  trend: { date: string; leads: number; clicks: number; spend: number; impressions: number }[];
  platforms: { platform: string; spend: number; leads: number; clicks: number; impressions: number }[];
  hasData: boolean;
};

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function GlobalAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const trend = useMemo(() => data?.trend || [], [data]);
  const platforms = data?.platforms || [];

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-8 animate-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">Analytics</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">Real performance metrics from your synced campaigns and ads.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/agents/usage" className="btn-secondary h-10 px-4">
              <Cpu className="h-4 w-4" />
              Usage Logs
            </Link>
            <button className="btn-secondary h-10 px-4" disabled>
              <Download className="h-4 w-4" />
              Export
            </button>
            <button className="btn-primary h-10 px-4" disabled>
              <Filter className="h-4 w-4" />
              Live Data
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-4">
          {[
            { label: "CTR", value: `${(data?.derived.ctr || 0).toFixed(2)}%`, icon: MousePointer2 },
            { label: "Leads", value: String(data?.totals.leads || 0), icon: Users },
            { label: "Avg CPC", value: money.format(data?.derived.cpc || 0), icon: Target },
            { label: "Spend", value: money.format(data?.totals.spend || 0), icon: TrendingUp },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-black text-black">{loading ? "-" : stat.value}</p>
            </div>
          ))}
        </div>

        {!loading && !data?.hasData ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
            <BarChart3 className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-lg font-black text-black">No performance data yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-zinc-500">
              Connect Meta, publish or sync campaigns, then this page will show actual spend, leads, clicks, impressions, and platform mix.
            </p>
            <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-bold text-white">
              Go to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-black">Performance trend</h2>
                <p className="mt-1 text-xs font-medium text-zinc-500">Grouped by the dates stored in your performance records.</p>
              </div>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="leads" stroke="#111827" fill="#111827" fillOpacity={0.08} strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" stroke="#2563eb" fill="#2563eb" fillOpacity={0.05} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-black">Platform mix</h2>
              <div className="space-y-4">
                {platforms.length === 0 ? (
                  <p className="text-sm font-medium text-zinc-500">No platform records yet.</p>
                ) : platforms.map((platform) => (
                  <div key={platform.platform} className="rounded-lg border border-zinc-100 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black capitalize">{platform.platform}</p>
                      <p className="text-xs font-bold text-zinc-500">{money.format(platform.spend)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs font-bold text-zinc-600">
                      <span>{platform.leads} leads</span>
                      <span>{platform.clicks} clicks</span>
                      <span>{platform.impressions} impr.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
