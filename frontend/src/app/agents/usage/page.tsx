"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, Clock, Cpu, History, Search, Users, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";

type AgentLog = {
  _id?: string;
  agentName?: string;
  provider?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  durationMs?: number;
  createdAt?: string;
};

type AgentJob = {
  _id: string;
  jobType: string;
  agentRole: string;
  status: string;
  error?: string;
  createdAt?: string;
  agentId?: { name?: string; role?: string; model?: string };
};

type UsageResponse = {
  recentLogs: AgentLog[];
  jobs: AgentJob[];
  team: { _id: string; name: string; role: string; status: string; performanceScore: number }[];
  summary: {
    totalInvocations: number;
    totalAgentJobs: number;
    completedAgentJobs: number;
    failedAgentJobs: number;
    activeAgents: number;
    totalCredits: number;
    avgLatencyMs: number;
  };
  jobsByDay: { date: string; count: number }[];
};

export default function AgentsUsagePage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const chartsReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    api.getAgentUsage()
      .then(setUsage)
      .catch(() => setUsage(null))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const jobs = usage?.jobs || [];
    const logs = usage?.recentLogs || [];
    const normalizedJobs = jobs.map((job) => ({
      id: job._id,
      type: job.jobType,
      node: job.agentId?.name || job.agentRole,
      model: job.agentId?.model || "",
      duration: "-",
      status: job.status,
      cost: "-",
      createdAt: job.createdAt,
    }));
    const normalizedLogs = logs.map((log, index) => ({
      id: log._id || `log-${index}`,
      type: log.agentName || "agent_call",
      node: log.provider || "provider",
      model: log.model || "",
      duration: log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "-",
      status: "completed",
      cost: `${(log.promptTokens || 0) + (log.completionTokens || 0)} tokens`,
      createdAt: log.createdAt,
    }));
    return [...normalizedJobs, ...normalizedLogs]
      .filter((row) => `${row.type} ${row.node} ${row.model}`.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 100);
  }, [usage, searchQuery]);

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-8 animate-in">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-black">Agent Usage</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500">Real agent jobs, provider calls, latency, and token usage.</p>
          </div>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-4">
          {[
            { label: "Invocations", value: usage?.summary.totalInvocations || 0, icon: Cpu },
            { label: "Active Agents", value: usage?.summary.activeAgents || 0, icon: Users },
            { label: "Agent Jobs", value: usage?.summary.totalAgentJobs || 0, icon: Zap },
            { label: "Avg Latency", value: `${((usage?.summary.avgLatencyMs || 0) / 1000).toFixed(1)}s`, icon: Clock },
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

        {!loading && rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
            <Cpu className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
            <h2 className="text-lg font-black text-black">No agent activity yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-zinc-500">
              Run agents from the campaign builder to populate this page with real jobs, provider calls, token counts, and statuses.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-black">Jobs by day</h2>
                <div className="h-[300px]">
                  {chartsReady ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usage?.jobsByDay || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#71717a" }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full w-full rounded-lg bg-zinc-50" />}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-sm font-black uppercase tracking-widest text-black">Agent team</h2>
                <div className="space-y-3">
                  {(usage?.team || []).map((agent) => (
                    <div key={agent._id} className="rounded-lg border border-zinc-100 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black">{agent.name}</p>
                        <span className="text-xs font-bold capitalize text-zinc-500">{agent.status}</span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-zinc-500">{agent.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-black">Activity Feed</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search activity"
                    className="h-10 w-64 rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-xs font-semibold outline-none"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-black uppercase tracking-widest text-zinc-400">
                      <th className="px-6 py-4">Type</th>
                      <th className="px-6 py-4">Agent / Provider</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                              <History className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-black capitalize text-black">{row.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-zinc-600">{row.node}</td>
                        <td className="px-6 py-4 text-xs font-bold text-zinc-600">{row.duration}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-black capitalize text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-bold text-black">{row.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
