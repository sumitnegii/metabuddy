"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  Rocket,
  ShieldCheck,
  Target,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";

type Agent = {
  _id: string;
  name: string;
  role: string;
  status: string;
  costPerTask: number;
  performanceScore: number;
  model?: string;
};

type AdCopy = {
  headline?: string;
  body?: string;
  hook?: string;
  cta?: string;
};

type CampaignDraft = {
  _id: string;
  title: string;
  brief: string;
  status: string;
  outputs?: {
    ideaExpansion?: { targetAudience?: string[]; marketAngle?: string };
    content?: { adCopies?: AdCopy[] };
  };
  meta?: {
    campaignId?: string;
    adSetId?: string;
    creativeId?: string;
    adId?: string;
  };
};

type AgentJob = {
  _id: string;
  jobType: string;
  agentRole: string;
  status: string;
  agentId?: { name?: string; role?: string; model?: string };
};

type ApprovalRequest = {
  _id: string;
  status: string;
  title: string;
};

type DraftBundle = {
  draft: CampaignDraft;
  jobs?: AgentJob[];
  approval?: ApprovalRequest;
  approvals?: ApprovalRequest[];
};

type BuilderStatus = "idle" | "draft" | "agents" | "approval" | "meta" | "done";

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Traffic" },
  { value: "OUTCOME_LEADS", label: "Leads" },
  { value: "OUTCOME_SALES", label: "Sales" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement" },
];

export default function GeneratePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [pageId, setPageId] = useState("");
  const [country, setCountry] = useState("IN");
  const [dailyBudget, setDailyBudget] = useState(1000);
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [automationLevel, setAutomationLevel] = useState("paused_meta");
  const [bundle, setBundle] = useState<DraftBundle | null>(null);
  const [status, setStatus] = useState<BuilderStatus>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await api.getMe();
        const idea = new URLSearchParams(window.location.search).get("idea");
        if (idea && active) setBrief(idea);
        const team: Agent[] = await api.getAgentTeam();
        if (!active) return;
        setAgents(team);
        setSelectedAgentIds(
          team
            .filter((agent) => agent.status !== "paused")
            .slice(0, 3)
            .map((agent) => agent._id)
        );
      } catch {
        window.location.href = "/";
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const selectedAgents = useMemo(
    () => agents.filter((agent) => selectedAgentIds.includes(agent._id)),
    [agents, selectedAgentIds]
  );

  const currentApproval = bundle?.approval || bundle?.approvals?.find((approval) => approval.status === "pending");
  const firstCopy = bundle?.draft.outputs?.content?.adCopies?.[0];
  const isBusy = status === "draft" || status === "agents" || status === "approval" || status === "meta";
  const canCreate = brief.trim().length > 0 && selectedAgentIds.length > 0 && !isBusy;

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((current) =>
      current.includes(agentId) ? current.filter((id) => id !== agentId) : [...current, agentId]
    );
  }

  async function buildDraft() {
    if (!canCreate) return;
    setError("");
    setBundle(null);
    setStatus("draft");

    try {
      const created: DraftBundle = await api.createCampaignDraft({
        brief: brief.trim(),
        selectedAgentIds,
        aiProvider: "gemini",
        automationLevel,
        launchConfig: {
          objective,
          websiteUrl,
          pageId,
          country,
          dailyBudget,
        },
      });

      setBundle(created);
      setStatus("agents");
      const generated: DraftBundle = await api.runCampaignDraftAgents(created.draft._id);
      setBundle(generated);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign draft failed");
      setBundle(null);
      setStatus("idle");
    }
  }

  async function approveAndPublish() {
    if (!bundle?.draft) return;
    setError("");
    setStatus("approval");
    try {
      await api.approveCampaignDraft(bundle.draft._id);
      setStatus("meta");
      const published: DraftBundle = await api.publishCampaignDraftToMeta(bundle.draft._id);
      setBundle(published);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meta publish failed");
      setStatus("done");
    }
  }

  const activeLabel =
    status === "draft"
      ? "Creating durable campaign draft"
      : status === "agents"
        ? "Selected agents are producing tracked jobs"
        : status === "approval"
          ? "Approving publish request"
          : status === "meta"
            ? "Publishing approved draft to Meta as paused"
            : "Ready";

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex flex-1 flex-col p-6 lg:p-10">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-400">Campaign builder</p>
              <h1 className="text-4xl font-black tracking-tight text-black">Create a Meta campaign with real agents</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-zinc-500">
                Build a durable draft, run selected agents as tracked jobs, approve the result, then publish paused assets to Meta.
              </p>
            </div>
            <Link href="/contacts" className="inline-flex h-11 items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-bold text-zinc-700 shadow-sm">
              <Plus className="h-4 w-4" />
              Manage agents
            </Link>
          </div>

          <section className="rounded-xl border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <Bot className="h-5 w-5 text-zinc-800" />
              <h2 className="text-lg font-bold tracking-tight text-black">How the Builder Works</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { title: "1. Describe Idea", desc: "Enter your product details, offer, and website URL in the brief section." },
                { title: "2. Select Agents", desc: "Choose which AI specialists will work on your audience, hooks, and copy." },
                { title: "3. Run Pipeline", desc: "Agents will create a structured campaign draft with multiple ad variants." },
                { title: "4. Meta Publish", desc: "Review the draft and approve it to create paused assets in your Meta account." }
              ].map((step, idx) => (
                <div key={idx} className="rounded-lg bg-zinc-50 p-4">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Phase {idx + 1}</span>
                  <h3 className="font-bold text-black">{step.title}</h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <Target className="h-5 w-5 text-zinc-500" />
                  <h2 className="text-lg font-black tracking-tight">Campaign brief</h2>
                </div>

                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Product or offer</span>
                    <textarea
                      value={brief}
                      onChange={(event) => setBrief(event.target.value)}
                      placeholder="Example: premium WhatsApp automation service for local gyms that need more trial bookings."
                      className="min-h-[130px] w-full resize-none rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur p-4 text-base font-semibold outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Website URL</span>
                      <input
                        value={websiteUrl}
                        onChange={(event) => setWebsiteUrl(event.target.value)}
                        placeholder="https://yourdomain.com"
                        className="h-12 w-full rounded-lg border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Meta Page ID</span>
                      <input
                        value={pageId}
                        onChange={(event) => setPageId(event.target.value)}
                        placeholder="Required for ad creative"
                        className="h-12 w-full rounded-lg border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Country</span>
                      <input
                        value={country}
                        onChange={(event) => setCountry(event.target.value.toUpperCase())}
                        className="h-12 w-full rounded-lg border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Objective</span>
                      <select
                        value={objective}
                        onChange={(event) => setObjective(event.target.value)}
                        className="h-12 w-full rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-4 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      >
                        {OBJECTIVES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Daily budget</span>
                      <input
                        type="number"
                        min={1}
                        value={dailyBudget}
                        onChange={(event) => setDailyBudget(Number(event.target.value || 0))}
                        className="h-12 w-full rounded-lg border border-zinc-200 px-4 text-sm font-semibold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                      />
                    </label>
                  </div>

                  <div>
                    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-zinc-400">Automation mode</span>
                    <div className="grid gap-3 md:grid-cols-3">
                      {[
                        ["draft", "Draft only"],
                        ["paused_meta", "Create paused Meta assets"],
                        ["autopilot_recommendations", "Agent recommendations"],
                      ].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAutomationLevel(value)}
                          className={`h-12 rounded-lg border px-3 text-sm font-black transition ${
                            automationLevel === value ? "border-orange-200 bg-orange-50 text-orange-800" : "border-zinc-200 bg-white text-zinc-600"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-zinc-500" />
                    <h2 className="text-lg font-black tracking-tight">Select campaign agents</h2>
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{selectedAgentIds.length} selected</span>
                </div>

                {agents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
                    <p className="text-sm font-bold text-zinc-500">No hired agents yet.</p>
                    <Link href="/recruit" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-[#F9734F] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(249,115,79,0.22)] hover:bg-[#EF6542]">
                      Hire agents
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {agents.map((agent) => {
                      const selected = selectedAgentIds.includes(agent._id);
                      return (
                        <button
                          key={agent._id}
                          type="button"
                          onClick={() => toggleAgent(agent._id)}
                          disabled={agent.status === "paused"}
                          className={`rounded-lg border p-4 text-left transition ${
                            agent.status === "paused"
                              ? "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-400"
                              : selected
                                ? "border-orange-200 bg-orange-50 text-orange-800"
                                : "border-zinc-200 bg-white text-black hover:border-zinc-400"
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black">{agent.name}</p>
                              <p className={`text-xs font-bold ${selected ? "text-zinc-400" : "text-zinc-500"}`}>{agent.role}</p>
                            </div>
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? "bg-white text-black" : "bg-zinc-100 text-zinc-400"}`}>
                              {selected && <Check className="h-4 w-4" />}
                            </span>
                          </div>
                          <div className={`flex items-center justify-between text-xs font-bold ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                            <span>{agent.model || "AI model"}</span>
                            <span>{agent.status === "paused" ? "Paused" : `${agent.performanceScore}%`}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={buildDraft}
                disabled={!canCreate}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-[#F9734F] text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,79,0.22)] transition hover:-translate-y-0.5 hover:bg-[#EF6542] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                Create draft and run agents
              </button>
            </section>

            <aside className="space-y-6">
              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-zinc-500" />
                  <h2 className="text-lg font-black tracking-tight">Workflow status</h2>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-sm font-black text-black">{activeLabel}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">
                    Every agent step is stored as a job. Meta publishing is gated by approval and creates paused assets.
                  </p>
                </div>

                {bundle?.jobs && bundle.jobs.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {bundle.jobs.map((job) => (
                      <div key={job._id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-black capitalize">{job.jobType}</p>
                          <p className="text-xs font-semibold text-zinc-500">{job.agentId?.name || job.agentRole}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 capitalize">{job.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {!bundle?.jobs && selectedAgents.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {selectedAgents.map((agent) => (
                      <div key={agent._id} className="flex items-center justify-between rounded-lg border border-zinc-100 px-4 py-3">
                        <div>
                          <p className="text-sm font-black">{agent.name}</p>
                          <p className="text-xs font-semibold text-zinc-500">{agent.role}</p>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Assigned</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {bundle?.draft && (
                <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <BarChart3 className="h-5 w-5 text-zinc-500" />
                    <h2 className="text-lg font-black tracking-tight">Review draft</h2>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Brief</p>
                      <p className="mt-2 text-lg font-black leading-7">{bundle.draft.brief}</p>
                    </div>

                    {bundle.draft.outputs?.ideaExpansion?.targetAudience && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Audience</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {bundle.draft.outputs.ideaExpansion.targetAudience.map((item) => (
                            <span key={item} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {firstCopy && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">First ad copy</p>
                        <div className="mt-3 rounded-lg bg-zinc-50 p-4">
                          <p className="text-sm font-black">{firstCopy.headline}</p>
                          <p className="mt-2 text-sm font-medium leading-6 text-zinc-600">{firstCopy.body}</p>
                        </div>
                      </div>
                    )}

                    {bundle.draft.meta?.campaignId ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm font-black text-emerald-800">Paused Meta assets created</p>
                        <p className="mt-1 text-xs font-bold text-emerald-700">Campaign: {bundle.draft.meta.campaignId}</p>
                        {bundle.draft.meta.adId && <p className="mt-1 text-xs font-bold text-emerald-700">Ad: {bundle.draft.meta.adId}</p>}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={approveAndPublish}
                        disabled={bundle.draft.status !== "ready_for_review" || !currentApproval || status === "meta" || status === "approval"}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#F9734F] text-sm font-black text-white shadow-[0_12px_28px_rgba(249,115,79,0.22)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status === "meta" || status === "approval" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                        Approve and publish paused to Meta
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
