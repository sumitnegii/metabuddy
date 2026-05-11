"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  GitBranch,
  Globe2,
  History,
  Heart,
  ImageIcon,
  Layers3,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdCreativeBackground } from "@/components/ui/adcreativeBackgrond";
import { Component as AiGeneratingUI } from "@/components/ui/aigenratingui";
import AdCreativeSidebar from "@/components/ui/sidebarforadcreative";
import { N8nWorkflowBlock } from "@/components/ui/workflow";
import { api } from "@/lib/api";

type AgentStatus = "ready" | "running" | "complete" | "fallback" | "failed";
type AgentOutput = string | Record<string, unknown> | unknown[];
type SectionId = "brief" | "intelligence" | "variations" | "previews" | "history" | "agents" | "report" | "workflow";
type PreviewPlatform = "facebook" | "instagram" | "whatsapp" | "webapp";

type AgentStep = {
  id: string;
  name: string;
  role: string;
  icon: typeof Bot;
  status: AgentStatus;
  output: AgentOutput;
  tokens: number;
  cost: number;
  durationMs?: number;
  error?: string;
  query?: string;
};

type PipelineAgent = Omit<AgentStep, "name" | "role" | "icon">;

type AdVariation = {
  id: string;
  name: string;
  bestFor: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  angle: string;
  scores: { clarity: number; emotion: number; trust: number; urgency: number; ctaStrength: number };
  adQualityScore: number;
  ctrPrediction: number;
  conversionRate: number;
  riskScore: number;
  predictionModel?: string;
  rank?: number;
  keywordUsed?: string;
};

type Intelligence = {
  variations: AdVariation[];
  bestAd: AdVariation;
  radar: Array<{ metric: string; value: number }>;
  funnel: Array<{ stage: string; value: number }>;
  forecast?: {
    basis: string;
    currency: string;
    assumedCpm: number;
    reach: number;
    impressions: number;
    frequency: number;
    clicks: number;
    ctr: number;
    conversions: number;
    conversionRate: number;
    spend: number;
    cpc: number;
    cpa: number;
    engagementRate: number;
    engagements: number;
    saves: number;
    shares: number;
    confidence: number;
    recommendation: string;
    assumptions: string[];
  };
  costBreakdown: Array<{ name: string; role: string; cost: number; tokens: number }>;
  insights: string[];
  preLaunchConfidence?: number;
  riskLevel?: string;
  memoryComparison?: {
    hasHistory: boolean;
    summary: string;
    improvementPercent: number;
    previousScore?: number;
  };
  competitorIdeas?: {
    hooks: string[];
    keywords: string[];
    source: string;
  };
  similarMetaAds?: {
    source: string;
    mode: string;
    liveAvailable: boolean;
    country: string;
    note: string;
    libraryUrl: string;
    ads: Array<{
      id: string;
      pageName: string;
      headline: string;
      body: string;
      cta: string;
      platforms: string[];
      startDate: string;
      impressions: string | Record<string, unknown>;
      spend: string | Record<string, unknown>;
      source: string;
      isLive: boolean;
      searchTerm: string;
      url: string;
      reason: string;
    }>;
  };
  mcpServices?: string[];
};

type PipelineResult = {
  agents: PipelineAgent[];
  totals: { tokens: number; cost: number };
  intelligence?: Intelligence;
  report?: AgentOutput;
  audit?: AgentOutput;
  mcp?: AgentOutput;
  mermaid?: string;
};

type StepResult = {
  step: number;
  output: AgentOutput;
  agent: PipelineAgent;
  previous: Record<string, unknown>;
  agents: PipelineAgent[];
  nextStep: number | null;
  done: boolean;
  final?: PipelineResult | null;
};

type SavedAdCreativeHistoryRun = {
  _id: string;
  prompt?: string;
  platform: PreviewPlatform;
  selectedVariationId?: string;
  bestAd?: AdVariation | null;
  variationCount?: number;
  variations: AdVariation[];
  intelligence?: Intelligence | null;
  agents?: PipelineAgent[];
  audit?: AgentOutput | null;
  report?: AgentOutput | null;
  mermaid?: string;
  totals?: { tokens?: number; cost?: number };
  fullResult?: PipelineResult | null;
  createdAt?: string;
  updatedAt?: string;
};

type HistoryPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
};

const generatingCopy: Record<number, string> = {
  1: "Analyzing persona...",
  2: "Finding keywords...",
  3: "Generating creatives...",
  4: "Building report...",
  5: "Auditing quality...",
  6: "Calculating cost...",
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const mermaidDefault = `flowchart LR
  U[User Prompt] --> A1[Persona]
  A1 --> A2[Keywords]
  A2 --> A3[Creative]
  A3 --> A4[Stitch]
  A4 --> A5[Audit]
  A5 --> A6[Logs + MCP]
  A6 --> R[Decision]`;

const baseAgents: AgentStep[] = [
  { id: "persona", name: "Agent 1", role: "Persona", icon: UserRound, status: "ready", output: "Buyer persona, pain points, intent, objections, and promise angle.", tokens: 0, cost: 0 },
  { id: "seo", name: "Agent 2", role: "SEO Keywords", icon: Search, status: "ready", output: "Search terms, benefit keywords, offer language, and negative terms.", tokens: 0, cost: 0 },
  { id: "creative", name: "Agent 3", role: "Ad Variations", icon: ImageIcon, status: "ready", output: "Generates 9 ranked ad variations for testing.", tokens: 0, cost: 0 },
  { id: "stitch", name: "Agent 4", role: "Strategy Stitch", icon: FileText, status: "ready", output: "Combines context into strategy, best angle, and handoff report.", tokens: 0, cost: 0 },
  { id: "auditor", name: "Agent 5", role: "Auditor + Predictor", icon: ShieldCheck, status: "ready", output: "Compares ads, predicts performance, ranks winners, and flags gaps.", tokens: 0, cost: 0 },
  { id: "logs", name: "Agent 6", role: "Logs + MCP", icon: Database, status: "ready", output: "Stores logs, token/cost estimate, MCP context, and workflow notes.", tokens: 0, cost: 0 },
];

const sections: Array<{ id: SectionId; label: string; icon: typeof Bot }> = [
  { id: "brief", label: "Brief", icon: Sparkles },
  { id: "intelligence", label: "Intelligence", icon: BarChart3 },
  { id: "variations", label: "Variations", icon: Layers3 },
  { id: "previews", label: "Ad Preview", icon: ImageIcon },
  { id: "history", label: "History", icon: History },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "report", label: "Report", icon: FileText },
  { id: "workflow", label: "Workflow", icon: GitBranch },
];

const previewPlatforms: Array<{ id: PreviewPlatform; label: string; helper: string; icon: typeof Bot }> = [
  { id: "facebook", label: "Facebook Feed", helper: "Sponsored feed unit", icon: ThumbsUp },
  { id: "instagram", label: "Instagram", helper: "Post/Reels-style ad", icon: ImageIcon },
  { id: "whatsapp", label: "WhatsApp", helper: "Click-to-message ad", icon: MessageCircle },
  { id: "webapp", label: "Web/App", helper: "Landing/app placement", icon: Globe2 },
];

const adIntentWords = [
  "sell",
  "promote",
  "advertise",
  "market",
  "launch",
  "generate leads",
  "get leads",
  "lead",
  "campaign",
  "ad",
  "creative",
  "meta",
  "facebook",
  "instagram",
  "shop",
  "book",
  "offer",
  "product",
  "service",
  "store",
  "ecommerce",
  "coaching",
  "clinic",
];

const blockedNonAdPrompts = [
  "who are you",
  "what are you",
  "hello",
  "hi",
  "hey",
  "test",
  "thank you",
  "thanks",
  "how are you",
];

function validateAdPrompt(value: string) {
  const normalized = value.toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "Tell the agents what product, service, or lead goal you want to advertise.";
  if (blockedNonAdPrompts.includes(normalized)) {
    return "This is not an ad brief. Enter something like: I want to sell t-shirts on Meta.";
  }
  if (normalized.split(" ").length < 3 && !adIntentWords.some((word) => normalized.includes(word))) {
    return "Please describe the ad goal with a product or service, for example: Sell running shoes on Meta.";
  }
  if (!adIntentWords.some((word) => normalized.includes(word))) {
    return "Please enter an advertising request, not a general question. Example: Get leads for a dental clinic.";
  }
  return "";
}

function asRecord(output: AgentOutput | null): Record<string, unknown> {
  return output && typeof output === "object" && !Array.isArray(output) ? output as Record<string, unknown> : {};
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asObjectArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function uniqueStrings(items: string[]) {
  return items.filter((item, index, list) => list.findIndex((other) => other.toLowerCase() === item.toLowerCase()) === index);
}

function shortSummary(output: AgentOutput) {
  if (typeof output === "string") return output;
  const record = asRecord(output);
  const summary = record.summary;
  if (typeof summary === "string") return summary;
  if (summary && typeof summary === "object") return "Structured agent output generated.";
  return "Agent output generated.";
}

function AgentOutputView({ output }: { output: AgentOutput }) {
  const record = asRecord(output);
  const chips = uniqueStrings([
    ...asStringArray(record.pains),
    ...asStringArray(record.pain_points),
    ...asStringArray(record.motivations),
    ...asStringArray(record.primaryKeywords),
    ...asStringArray(record.benefitKeywords),
    ...asStringArray(record.missingInputs),
    ...asStringArray(record.recommendedFixes),
    ...asStringArray(record.handoffChecklist),
    ...asStringArray(record.mcpContext),
  ]).slice(0, 8);
  const keywordObjects = asObjectArray(record.keywords).slice(0, 6);
  const ads = asObjectArray(record.ads).slice(0, 5);
  const results = asObjectArray(record.results).slice(0, 5);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold leading-6 text-zinc-700">{shortSummary(output)}</p>
      <div className="grid gap-2 md:grid-cols-2">
        {typeof record.age_range === "string" && <Metric label="Age range" value={record.age_range} />}
        {typeof record.intent_level === "string" && <Metric label="Intent" value={record.intent_level} />}
        {typeof record.buying_trigger === "string" && <Metric label="Buying trigger" value={record.buying_trigger} />}
        {typeof record.best_angle === "string" && <Metric label="Best angle" value={record.best_angle} />}
        {typeof record.confidence === "number" && <Metric label="Confidence" value={`${record.confidence}%`} />}
        {typeof record.risk_level === "string" && <Metric label="Risk level" value={record.risk_level} />}
      </div>
      {typeof record.persona === "string" && <p className="rounded-lg bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">{record.persona}</p>}
      {typeof record.strategy === "string" && <p className="rounded-lg bg-zinc-50 p-3 text-sm font-semibold text-zinc-600">{record.strategy}</p>}
      {typeof record.primaryText === "string" && (
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Primary text</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-zinc-700">{record.primaryText}</p>
        </div>
      )}
      {typeof record.headline === "string" && <Metric label="Headline" value={record.headline} />}
      {typeof record.alignmentScore === "number" && <Metric label="Alignment score" value={`${record.alignmentScore}/100`} />}
      {keywordObjects.length > 0 && (
        <div className="grid gap-2">
          {keywordObjects.map((keyword) => (
            <p key={`${keyword.term}-${keyword.source}`} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">
              {String(keyword.term || "")} · <span className="text-zinc-400">{String(keyword.intent || "medium")} intent</span>
              {keyword.hook ? <span className="text-zinc-400"> · {String(keyword.hook)}</span> : null}
              {keyword.source ? <span className="text-zinc-400"> · {String(keyword.source)}</span> : null}
            </p>
          ))}
        </div>
      )}
      {ads.length > 0 && (
        <div className="grid gap-2">
          {ads.map((ad) => <p key={`${ad.type}-${ad.headline}`} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">{String(ad.type || "ad")} · {String(ad.headline || "")}{ad.keywordUsed ? <span className="text-zinc-400"> · keyword: {String(ad.keywordUsed)}</span> : null}</p>)}
        </div>
      )}
      {results.length > 0 && (
        <div className="grid gap-2">
          {results.map((result) => <p key={`${result.ad_type}`} className="rounded-lg bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700">{String(result.ad_type || "ad")} · score {String(result.score || "-")} · CTR {String(result.ctr || "-")}%</p>)}
        </div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, index) => <span key={`${chip}-${index}`} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{chip}</span>)}
        </div>
      )}
    </div>
  );
}

function BulletBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => <p key={item} className="text-sm font-semibold leading-6 text-zinc-700">{item}</p>)}
      </div>
    </div>
  );
}

export default function AdCreativesPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("brief");
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [agents, setAgents] = useState<AgentStep[]>(baseAgents);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<AgentOutput | null>(null);
  const [mermaid, setMermaid] = useState(mermaidDefault);
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>("facebook");
  const [openingPreviewId, setOpeningPreviewId] = useState("");
  const [savedPreviewIds, setSavedPreviewIds] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<SavedAdCreativeHistoryRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState<HistoryPagination>({ page: 1, limit: 12, total: 0, totalPages: 1, hasPrev: false, hasNext: false });
  const [loadingHistoryRunId, setLoadingHistoryRunId] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [showGenerating, setShowGenerating] = useState(false);

  const totals = useMemo(() => agents.reduce((acc, agent) => {
    acc.tokens += agent.tokens;
    acc.cost += agent.cost;
    return acc;
  }, { tokens: 0, cost: 0 }), [agents]);

  function buildStructuredPrompt() {
    return prompt.trim();
  }

  async function loadHistory(force = false, page = historyPage) {
    if (historyLoading || (historyLoaded && !force)) return;
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await api.getAdCreativeHistoryRuns(page, 12) as { history?: SavedAdCreativeHistoryRun[]; pagination?: HistoryPagination };
      setHistory(response.history || []);
      setHistoryPage(response.pagination?.page || page);
      setHistoryPagination(response.pagination || { page, limit: 12, total: response.history?.length || 0, totalPages: 1, hasPrev: false, hasNext: false });
      setHistoryLoaded(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load ad creative history";
      setHistoryError(message.toLowerCase().includes("route not found")
        ? "History route is not available on the running backend yet. Restart or redeploy the backend so /api/ad-creative-history is registered."
        : message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function saveCreativeHistory(nextIntelligence: Intelligence | null, sourcePrompt: string, finalResult: PipelineResult | null, completedAgents: PipelineAgent[]) {
    if (!nextIntelligence?.variations?.length) return;
    const payload = {
      prompt: sourcePrompt,
      platform: previewPlatform,
      selectedVariationId: nextIntelligence.bestAd?.id || nextIntelligence.variations[0]?.id || "",
      bestAd: nextIntelligence.bestAd || nextIntelligence.variations[0] || null,
      variations: nextIntelligence.variations,
      intelligence: nextIntelligence,
      agents: completedAgents,
      audit: finalResult?.audit || null,
      report: finalResult?.report || null,
      mermaid: finalResult?.mermaid || mermaid,
      totals: finalResult?.totals || totals,
      fullResult: finalResult,
    };

    const response = await api.createAdCreativeHistoryRun(payload) as { history?: SavedAdCreativeHistoryRun };
    if (!response.history) throw new Error("Ad creative history was not saved");
    if (historyPage === 1) setHistory((current) => [response.history as SavedAdCreativeHistoryRun, ...current].slice(0, historyPagination.limit || 12));
    setHistoryPagination((current) => ({ ...current, total: current.total + 1, totalPages: Math.max(1, Math.ceil((current.total + 1) / current.limit)) }));
    setHistoryLoaded(true);
  }

  useEffect(() => {
    if (activeSection === "history") {
      void loadHistory();
    }
  }, [activeSection]);

  async function runPreanalysis() {
    const fullPrompt = buildStructuredPrompt();
    const validationError = validateAdPrompt(fullPrompt);
    if (validationError) {
      setError(validationError);
      setActiveSection("brief");
      setShowGenerating(false);
      setIsRunning(false);
      setCurrentStep(0);
      return;
    }
    let previous: Record<string, unknown> = {};
    let completedAgents: PipelineAgent[] = [];

    setError("");
    setIsRunning(true);
    setAudit(null);
    setIntelligence(null);
    setSelectedVariationId("");
    setSavedPreviewIds({});
    setCurrentStep(1);
    setShowGenerating(true);
    setAgents(baseAgents.map((agent, agentIndex) => ({
      ...agent,
      status: agentIndex === 0 ? "running" : "ready",
      tokens: 0,
      cost: 0,
      durationMs: 0,
      error: "",
      query: "",
    })));
    setActiveSection("agents");

    try {
      for (let step = 1; step <= baseAgents.length; step += 1) {
        setCurrentStep(step);
        setAgents(baseAgents.map((agent, agentIndex) => {
          const completed = completedAgents.find((item) => item.id === agent.id);
          if (completed) return { ...agent, ...completed };
          return {
            ...agent,
            status: agentIndex === step - 1 ? "running" : agentIndex < step - 1 ? "complete" : "ready",
            tokens: 0,
            cost: 0,
            durationMs: 0,
            error: "",
            query: "",
          };
        }));

        const stepRequest = api.runAdCreativeAgentStep({
          step,
          data: {
            userPrompt: fullPrompt,
            previous,
            agents: completedAgents,
          },
        }) as Promise<StepResult>;

        const [result] = await Promise.all([
          stepRequest,
          wait(900),
        ]);

        previous = result.previous || previous;
        completedAgents = result.agents || [...completedAgents, result.agent];

        setAgents(baseAgents.map((agent) => {
          const returned = completedAgents.find((item) => item.id === agent.id);
          return returned ? { ...agent, ...returned } : agent;
        }));

        if (result.final) {
          setAudit(result.final.audit || null);
          setIntelligence(result.final.intelligence || null);
          setSelectedVariationId(result.final.intelligence?.bestAd?.id || "");
          if (result.final.mermaid) setMermaid(result.final.mermaid);
          await saveCreativeHistory(result.final.intelligence || null, fullPrompt, result.final, completedAgents).catch((saveError) => {
            setError(saveError instanceof Error ? saveError.message : "Generated creatives could not be saved to history");
          });
        }
      }
    } catch (err) {
      setShowGenerating(false);
      setError(err instanceof Error ? err.message : "Ad creative agents failed");
      setAgents((current) => current.map((agent) => ({ ...agent, status: "failed" })));
      setActiveSection("agents");
    } finally {
      setIsRunning(false);
      setShowGenerating(false);
      setCurrentStep(0);
    }
  }

  const bestAd = intelligence?.bestAd;
  const selectedAd = intelligence?.variations.find((variation) => variation.id === selectedVariationId) || bestAd;
  const activeAgent = currentStep > 0 ? agents[currentStep - 1] : null;

  async function openPreviewPage(variation: AdVariation, rank: number) {
    setSelectedVariationId(variation.id);
    setOpeningPreviewId(variation.id);
    setError("");
    const savedId = savedPreviewIds[variation.id];
    if (savedId) {
      window.open(`/ad-creatives/preview/${savedId}`, "_blank", "noopener,noreferrer");
      setOpeningPreviewId("");
      return;
    }
    const fallbackPayload = {
      variation,
      platform: previewPlatform,
      rank,
      currency: intelligence?.forecast?.currency || "INR",
      cpm: intelligence?.forecast?.assumedCpm || 100,
      savedAt: new Date().toISOString(),
    };
    try {
      const response = await api.createAdCreativePreview({
        variation,
        platform: previewPlatform,
        rank,
        currency: intelligence?.forecast?.currency || "INR",
        cpm: intelligence?.forecast?.assumedCpm || 100,
        prompt,
        forecast: intelligence?.forecast || null,
      }) as { preview?: { _id?: string } };
      const id = response.preview?._id;
      if (!id) throw new Error("Preview draft was not created");
      setSavedPreviewIds((current) => ({ ...current, [variation.id]: id }));
      window.open(`/ad-creatives/preview/${id}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open preview draft";
      if (message.toLowerCase().includes("route not found")) {
        window.localStorage.setItem("mb_ad_creative_preview", JSON.stringify(fallbackPayload));
        window.open("/ad-creatives/preview", "_blank", "noopener,noreferrer");
      } else {
        setError(message);
      }
    } finally {
      setOpeningPreviewId("");
    }
  }

  async function loadHistoryRun(run: SavedAdCreativeHistoryRun) {
    setLoadingHistoryRunId(run._id);
    setError("");
    try {
      const response = await api.getAdCreativeHistoryRun(run._id) as { history?: SavedAdCreativeHistoryRun };
      const fullRun = response.history || run;
      const restoredIntelligence = fullRun.intelligence || (fullRun.variations.length ? {
      variations: fullRun.variations,
      bestAd: fullRun.bestAd || fullRun.variations[0],
      radar: [],
      funnel: [],
      costBreakdown: [],
      insights: [],
    } as Intelligence : null);

    setPrompt(fullRun.prompt || "");
    setPreviewPlatform(fullRun.platform || "facebook");
    setIntelligence(restoredIntelligence);
    setSelectedVariationId(fullRun.selectedVariationId || fullRun.bestAd?.id || fullRun.variations[0]?.id || "");
    setAudit(fullRun.audit || null);
    setMermaid(fullRun.mermaid || mermaidDefault);
    setSavedPreviewIds({});
    setCurrentStep(0);
    setShowGenerating(false);
    if (fullRun.agents?.length) {
      setAgents(baseAgents.map((agent) => {
        const saved = fullRun.agents?.find((item) => item.id === agent.id);
        return saved ? { ...agent, ...saved } : agent;
      }));
    } else {
      setAgents(baseAgents);
    }
    setActiveSection("intelligence");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load this creative run");
    } finally {
      setLoadingHistoryRunId("");
    }
  }

  return (
    <div className="flex min-h-screen bg-white text-black">
      {showGenerating && <AiGeneratingUI text={generatingCopy[currentStep] || "Generating..."} />}
      <AdCreativeSidebar
        sections={sections}
        activeSection={activeSection}
        onSectionChange={(sectionId) => setActiveSection(sectionId as SectionId)}
        tokens={totals.tokens}
        cost={totals.cost}
      />
      <AdCreativeBackground className="ml-[280px] flex-1">
        <section className="border-b border-white/10 bg-black/[0.62] px-6 py-8 text-white shadow-[0_22px_70px_rgba(0,0,0,0.22)] backdrop-blur-md lg:px-10">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Ad Creative Intelligence</p>
              <h1 className="max-w-4xl text-[42px] font-black leading-tight tracking-tight">Build, score, compare, and choose winning ads.</h1>
              <p className="mt-4 max-w-3xl text-[15px] font-semibold leading-6 text-zinc-400">
                User input runs through six separate agents: persona, ads-library keywords, Facebook creative, stitch report, auditor, and logs.
              </p>
            </div>
            <button onClick={runPreanalysis} disabled={isRunning || !prompt.trim()} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-black transition hover:bg-zinc-200 disabled:opacity-60">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Run Agent Pipeline
            </button>
          </div>
        </section>

        <div className="mx-auto max-w-[1500px] px-6 py-6 lg:px-10">
          <section className="min-w-0">
            {error && <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

            {activeSection === "brief" && (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-lg border border-white/60 bg-white/[0.9] p-6 shadow-sm backdrop-blur-md">
                  <h2 className="text-2xl font-black">What do you want to advertise?</h2>
                  <p className="mt-2 text-sm font-semibold text-zinc-500">Write it naturally. The agents will infer audience, keywords, creative angles, copy, audit, cost, and report data.</p>
                  <label className="mt-5 block">
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Your request</span>
                    <textarea
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      placeholder="Example: I want to sell my shoes on Meta"
                      className="mt-2 min-h-44 w-full resize-none rounded-lg border border-zinc-200 bg-white/90 p-4 text-base font-semibold leading-7 outline-none focus:border-black"
                    />
                  </label>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {["I want to sell my shoes", "Promote my fitness coaching", "Sell handmade candles", "Get leads for a dental clinic"].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setPrompt(example)}
                        className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-600 transition hover:border-black hover:text-black"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-white/60 bg-white/[0.86] p-5 shadow-sm backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Agents infer</p>
                  <h3 className="mt-2 text-lg font-black">No manual campaign form</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">The first agent reads your sentence. Every later agent works from previous outputs, not from fixed form defaults.</p>
                    <div className="mt-3 grid gap-2">
                      {[
                        "Persona and buyer intent",
                        "Meta-style keyword signals",
                        "Headlines, hooks, CTA, and ad copy",
                        "Creative direction for image, carousel, and video",
                        "Prompt alignment audit",
                        "Token and cost log",
                      ].map((item) => (
                        <p key={item} className="flex items-center gap-2 text-sm font-black text-zinc-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{item}</p>
                      ))}
                    </div>
                </div>
              </div>
            )}

            {activeSection === "intelligence" && (
              <div className="space-y-5">
                {!intelligence ? (
                  <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center shadow-sm">
                    <BarChart3 className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
                    <h2 className="text-xl font-black">Run agents to build the intelligence dashboard</h2>
                    <p className="mt-2 text-sm font-semibold text-zinc-500">Scores, predictions, charts, and recommendation will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 lg:grid-cols-5">
                      {[
                        ["Ad Score", `${bestAd?.adQualityScore}/10`, bestAd?.rank ? `Rank #${bestAd.rank} · ${bestAd.name}` : bestAd?.name],
                        ["CTR Prediction", `${bestAd?.ctrPrediction}%`, "Estimated click-through"],
                        ["Conversion", `${bestAd?.conversionRate}%`, "Predicted post-click"],
                        ["Confidence", `${intelligence.preLaunchConfidence || 0}%`, "Pre-launch confidence"],
                        ["Risk", intelligence.riskLevel || `${bestAd?.riskScore}/10`, "Lower is safer"],
                      ].map(([label, value, helper]) => (
                        <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
                          <p className="mt-4 text-3xl font-black">{value}</p>
                          <p className="mt-2 text-xs font-semibold text-zinc-500">{helper}</p>
                        </div>
                      ))}
                    </div>

                    {intelligence.forecast && (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                        <ForecastMetric label="Reach" value={intelligence.forecast.reach.toLocaleString()} helper="Predicted people reached" />
                        <ForecastMetric label="Impressions" value={intelligence.forecast.impressions.toLocaleString()} helper={`${intelligence.forecast.frequency}x frequency`} />
                        <ForecastMetric label="Clicks" value={intelligence.forecast.clicks.toLocaleString()} helper={`${intelligence.forecast.ctr}% CTR`} />
                        <ForecastMetric label="Conversions" value={intelligence.forecast.conversions.toLocaleString()} helper={`${intelligence.forecast.conversionRate}% post-click`} />
                        <ForecastMetric label="Spend" value={formatMoney(intelligence.forecast.spend, intelligence.forecast.currency)} helper={`${formatMoney(intelligence.forecast.assumedCpm, intelligence.forecast.currency)} CPM`} />
                        <ForecastMetric label="CPA" value={formatMoney(intelligence.forecast.cpa, intelligence.forecast.currency)} helper="Cost per conversion" />
                      </div>
                    )}

                    <div className="grid gap-5 xl:grid-cols-3">
                      <ChartPanel title="Performance Radar">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={intelligence.radar}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 700 }} />
                            <Radar dataKey="value" stroke="#111" fill="#111" fillOpacity={0.18} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </ChartPanel>
                      <ChartPanel title="Funnel Prediction">
                        <ResponsiveContainer width="100%" height="100%">
                          <FunnelChart>
                            <Tooltip />
                            <Funnel dataKey="value" data={intelligence.funnel} fill="#111">
                              <LabelList position="right" fill="#111" stroke="none" dataKey="stage" />
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </ChartPanel>
                      <ChartPanel title="Agent Cost">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={intelligence.costBreakdown}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`₹${Number(value).toFixed(4)}`, "Estimated cost"]} />
                            <Bar dataKey="cost" fill="#111" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartPanel>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
                      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Decision Engine</p>
                        <h2 className="mt-3 text-3xl font-black">Recommended: {bestAd?.name} Creative</h2>
                        <p className="mt-2 text-sm font-semibold text-zinc-500">{bestAd?.angle} · Best for {bestAd?.bestFor} · {intelligence.preLaunchConfidence}% confidence</p>
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          <Metric label="Rank" value={bestAd?.rank ? `#${bestAd.rank} of ${intelligence.variations.length}` : "Pending"} />
                          <Metric label="Keyword used" value={bestAd ? variationKeyword(bestAd) : "Pending"} />
                          <Metric label="Predicted CPC" value={intelligence.forecast ? formatMoney(intelligence.forecast.cpc, intelligence.forecast.currency) : "Pending"} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {(intelligence.mcpServices || []).map((service) => (
                            <span key={service} className="rounded-full bg-black px-3 py-1 text-xs font-black uppercase tracking-wider text-white">{service} MCP</span>
                          ))}
                        </div>
                        <div className="mt-5 grid gap-2">
                          {intelligence.insights.map((insight) => <p key={insight} className="rounded-lg bg-zinc-50 px-4 py-3 text-sm font-semibold leading-6 text-zinc-700">{insight}</p>)}
                        </div>
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <Metric label="Memory delta" value={intelligence.memoryComparison?.hasHistory ? `${intelligence.memoryComparison.improvementPercent}%` : "Baseline"} />
                          <Metric label="Competitor hook" value={intelligence.competitorIdeas?.hooks?.[0] || "Pending"} />
                        </div>
                      </div>
                      <AdPreview ad={selectedAd} />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === "variations" && (
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 p-5"><h2 className="text-xl font-black">Ad Variation Comparison</h2><p className="mt-1 text-sm font-semibold text-zinc-500">Real generated copy, market keyword, CTA, and predicted Meta launch numbers for this request.</p></div>
                {!intelligence ? <EmptyState text="Run agents to compare ad variations." /> : intelligence.variations.map((variation) => (
                  <button key={variation.id} type="button" onClick={() => setSelectedVariationId(variation.id)} className={`grid w-full gap-5 border-b border-zinc-100 p-5 text-left transition last:border-b-0 hover:bg-zinc-50 xl:grid-cols-[minmax(0,1fr)_520px] ${selectedVariationId === variation.id ? "bg-zinc-50" : "bg-white"}`}>
                    <VariationCopyBlock variation={variation} best={variation.id === bestAd?.id} />
                    <VariationForecastBlock variation={variation} currency={intelligence.forecast?.currency || "INR"} cpm={intelligence.forecast?.assumedCpm || 100} />
                  </button>
                ))}
              </div>
            )}

            {activeSection === "previews" && (
              <div className="space-y-5">
                {!intelligence ? (
                  <EmptyState text="Run agents to generate 9 ranked ad previews." />
                ) : (
                  <>
                    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ranked ad previews</p>
                          <h2 className="mt-2 text-2xl font-black">9 realistic placement previews from the same user input</h2>
                          <p className="mt-2 text-sm font-semibold text-zinc-500">Switch platform to inspect how each creative reads on Facebook, Instagram, WhatsApp, and web/app placements.</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-4">
                          {previewPlatforms.map((platform) => (
                            <button
                              key={platform.id}
                              type="button"
                              onClick={() => setPreviewPlatform(platform.id)}
                              className={`rounded-lg border px-3 py-2 text-left transition ${
                                previewPlatform === platform.id ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-xs font-black">
                                <platform.icon className="h-4 w-4" />
                                {platform.label}
                              </span>
                              <span className={`mt-1 block text-[10px] font-bold ${previewPlatform === platform.id ? "text-zinc-300" : "text-zinc-400"}`}>{platform.helper}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {intelligence.variations.slice(0, 9).map((variation, index) => (
                        <RankedAdPreview
                          key={variation.id}
                          variation={variation}
                          rank={variation.rank || index + 1}
                          selected={selectedVariationId === variation.id}
                          currency={intelligence.forecast?.currency || "INR"}
                          cpm={intelligence.forecast?.assumedCpm || 100}
                          platform={previewPlatform}
                          isOpening={openingPreviewId === variation.id}
                          onSelect={() => openPreviewPage(variation, variation.rank || index + 1)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeSection === "history" && (
              <div className="space-y-5">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Database history</p>
                      <h2 className="mt-2 text-2xl font-black">Saved creative runs</h2>
                      <p className="mt-2 text-sm font-semibold text-zinc-500">Compact paginated history. Open a row to load the full stored run object only when needed.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-600">
                        {historyPagination.total.toLocaleString()} runs
                      </span>
                      <button
                        type="button"
                        onClick={() => loadHistory(true, historyPage)}
                        disabled={historyLoading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 transition hover:border-black hover:text-black disabled:opacity-60"
                      >
                        {historyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {historyLoading && history.length === 0 ? (
                  <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm">
                    <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-zinc-400" />
                    <p className="text-sm font-bold text-zinc-500">Loading saved creatives...</p>
                  </div>
                ) : historyError ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center shadow-sm">
                    <h3 className="text-lg font-black text-amber-900">History is not connected yet</h3>
                    <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-amber-800">{historyError}</p>
                  </div>
                ) : history.length === 0 ? (
                  <EmptyState text="No saved creative runs yet. Run the agents once to store the full generated object in the database." />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="min-w-[820px]">
                    <div className="grid grid-cols-[minmax(0,1.3fr)_100px_96px_96px_120px_110px] gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
                      <span>Creative run</span>
                      <span>Platform</span>
                      <span>Ads</span>
                      <span>Best CTR</span>
                      <span>Saved</span>
                      <span className="text-right">Action</span>
                    </div>
                    <div className="divide-y divide-zinc-100">
                      {history.map((run) => {
                        const best = run.bestAd || run.intelligence?.bestAd || run.variations[0];
                        const savedAt = run.createdAt ? new Date(run.createdAt).toLocaleDateString() : "Saved";
                        return (
                          <div key={run._id} className="grid grid-cols-[minmax(0,1.3fr)_100px_96px_96px_120px_110px] items-center gap-3 px-4 py-3 transition hover:bg-zinc-50">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-zinc-950">{best?.headline || "Saved creative run"}</p>
                              <p className="mt-1 truncate text-xs font-semibold text-zinc-500">{run.prompt || "Prompt not stored"}</p>
                            </div>
                            <span className="truncate text-xs font-black text-zinc-600">{platformLabel(run.platform)}</span>
                            <span className="text-xs font-black text-zinc-700">{run.variationCount || run.variations.length}</span>
                            <span className="text-xs font-black text-zinc-700">{(best?.ctrPrediction || 0).toFixed(2)}%</span>
                            <span className="text-xs font-bold text-zinc-500">{savedAt}</span>
                            <button
                              type="button"
                              onClick={() => loadHistoryRun(run)}
                              disabled={loadingHistoryRunId === run._id}
                              className="ml-auto inline-flex h-9 items-center gap-2 rounded-full bg-black px-3 text-xs font-black text-white transition hover:bg-zinc-800 disabled:opacity-60"
                            >
                              {loadingHistoryRunId === run._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                              Load
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                      <p className="text-xs font-bold text-zinc-500">
                        Page {historyPagination.page} of {historyPagination.totalPages} · {historyPagination.total.toLocaleString()} total
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => loadHistory(true, Math.max(1, historyPagination.page - 1))}
                          disabled={historyLoading || !historyPagination.hasPrev}
                          className="h-9 rounded-full border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 disabled:opacity-40"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => loadHistory(true, historyPagination.page + 1)}
                          disabled={historyLoading || !historyPagination.hasNext}
                          className="h-9 rounded-full border border-zinc-200 bg-white px-4 text-xs font-black text-zinc-700 disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "agents" && (
              <div className="grid gap-4">
                <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Sequential agent run</p>
                      <h2 className="mt-1 text-xl font-black">{activeAgent ? generatingCopy[currentStep] : "Ready for user input"}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{totals.tokens.toLocaleString()}</p>
                      <p className="text-xs font-semibold text-zinc-500">₹{totals.cost.toFixed(4)} estimated</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 md:grid-cols-6">
                    {agents.map((agent) => (
                      <div key={agent.id} className={`rounded-lg border p-3 ${agent.status === "running" ? "border-black bg-black text-white" : agent.status === "complete" || agent.status === "fallback" ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-zinc-200 bg-zinc-50 text-zinc-500"}`}>
                        <p className="text-xs font-black uppercase">{agent.name}</p>
                        <p className="mt-1 text-sm font-black">{agent.role}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {agents.map((agent) => (
                    <div key={agent.id} className={`rounded-lg border bg-white p-5 shadow-sm ${agent.status === "running" ? "border-black" : "border-zinc-200"}`}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100"><agent.icon className="h-5 w-5" /></div><div><p className="text-xs font-black uppercase tracking-widest text-zinc-400">{agent.name}</p><h2 className="font-black">{agent.role}</h2></div></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${agent.status === "complete" ? "bg-emerald-50 text-emerald-700" : agent.status === "fallback" ? "bg-amber-50 text-amber-700" : agent.status === "failed" ? "bg-red-50 text-red-700" : agent.status === "running" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"}`}>{agent.status}</span>
                    </div>
                    {agent.query && (
                      <details className="mb-3 rounded-lg bg-zinc-50 p-3">
                        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-zinc-400">Agent query</summary>
                        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-zinc-700">{agent.query}</pre>
                      </details>
                    )}
                    <AgentOutputView output={agent.output} />
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-xs font-black text-zinc-500">
                      <Metric label="Tokens" value={agent.tokens.toLocaleString()} />
                      <Metric label="Est. cost" value={`₹${agent.cost.toFixed(4)}`} />
                      <Metric label="Time" value={`${agent.durationMs || 0}ms`} />
                    </div>
                  </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "report" && (
              <LaunchForecastReport intelligence={intelligence} audit={audit} />
            )}

            {activeSection === "workflow" && (
              <WorkflowDiagram agents={agents} mermaid={mermaid} prompt={prompt} intelligence={intelligence} />
            )}
          </section>
        </div>
      </AdCreativeBackground>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  return (
    <div className="min-w-0 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black">{title}</h2>
      <div className="h-72 min-w-0">
        {isClient ? children : <div className="h-full w-full rounded-lg bg-zinc-50" />}
      </div>
    </div>
  );
}

function agentWorkflowDescription(agent: AgentStep) {
  const record = asRecord(agent.output);
  const keywords = asObjectArray(record.keywords).map((item) => String(item.term || item.keyword || "")).filter(Boolean);
  const ads = asObjectArray(record.ads);
  const results = asObjectArray(record.results);

  if (agent.id === "persona") {
    return typeof record.persona === "string"
      ? `Built persona: ${record.persona}`
      : shortSummary(agent.output);
  }
  if (agent.id === "seo") {
    return keywords.length
      ? `Found market keywords: ${keywords.slice(0, 3).join(", ")}`
      : shortSummary(agent.output);
  }
  if (agent.id === "creative") {
    const headline = typeof record.headline === "string" ? record.headline : String(ads[0]?.headline || "");
    const keyword = String(ads[0]?.keywordUsed || "");
    return headline ? `Generated ad creative: ${headline}${keyword ? ` using ${keyword}` : ""}` : shortSummary(agent.output);
  }
  if (agent.id === "stitch") {
    return typeof record.strategy === "string"
      ? `Stitched strategy: ${record.strategy}`
      : shortSummary(agent.output);
  }
  if (agent.id === "auditor") {
    const confidence = typeof record.confidence === "number" ? `${record.confidence}% confidence` : "confidence pending";
    const winner = typeof record.best_ad === "string" ? record.best_ad : String(results[0]?.ad_type || "winner pending");
    return `Audited prompt alignment and ranked ${winner} with ${confidence}.`;
  }
  if (agent.id === "logs") {
    const totalCost = typeof record.total_cost === "string" ? record.total_cost : `₹${agent.cost.toFixed(4)}`;
    return `Logged ${agent.tokens.toLocaleString()} tokens, estimated ${totalCost}, and stored MCP context.`;
  }
  return shortSummary(agent.output);
}

function finalWorkflowDescription(intelligence: Intelligence | null) {
  const forecast = intelligence?.forecast;
  const similarAds = intelligence?.similarMetaAds;
  if (!forecast) return "Final output will include forecast, best ad, audit, cost, similar Meta ads, and Mermaid data.";
  return `Predicted ${forecast.reach.toLocaleString()} reach, ${forecast.clicks.toLocaleString()} clicks, ${forecast.conversions.toLocaleString()} conversions, ${formatMoney(forecast.spend, forecast.currency)} spend. Similar Meta ads: ${similarAds?.ads?.length || 0}.`;
}

function WorkflowDiagram({ agents, mermaid, prompt, intelligence }: { agents: AgentStep[]; mermaid: string; prompt: string; intelligence: Intelligence | null }) {
  const colorForStatus = (status: AgentStatus) => {
    if (status === "complete") return "emerald";
    if (status === "fallback") return "amber";
    if (status === "failed") return "purple";
    if (status === "running") return "orange";
    return "zinc";
  };

  const workflowNodes = useMemo(() => [
    {
      id: "prompt",
      type: "trigger" as const,
      title: "User Input",
      description: prompt.trim() ? `Current request: ${prompt.trim()}` : "Natural-language request enters the agent pipeline.",
      icon: Sparkles,
      color: "orange",
      position: { x: 40, y: 180 },
    },
    ...agents.map((agent, index) => ({
      id: agent.id,
      type: index === 4 ? "condition" as const : "action" as const,
      title: `${agent.name}: ${agent.role}`,
      description: agentWorkflowDescription(agent),
      icon: agent.icon,
      color: colorForStatus(agent.status),
      position: { x: 300 + index * 250, y: index % 2 === 0 ? 95 : 270 },
    })),
    {
      id: "final",
      type: "action" as const,
      title: "Final Report",
      description: finalWorkflowDescription(intelligence),
      icon: FileText,
      color: "emerald",
      position: { x: 1800, y: 180 },
    },
  ], [agents, prompt, intelligence]);

  const workflowConnections = useMemo(() => [
    { from: "prompt", to: "persona" },
    { from: "persona", to: "seo" },
    { from: "seo", to: "creative" },
    { from: "creative", to: "stitch" },
    { from: "stitch", to: "auditor" },
    { from: "auditor", to: "logs" },
    { from: "logs", to: "final" },
  ], []);
  const workflowKey = workflowNodes.map((node) => `${node.id}:${node.description}`).join("|");

  return (
    <N8nWorkflowBlock
      key={workflowKey}
      title="Agent Workflow"
      subtitle="Actual current request execution. Each node shows what that agent produced for this run."
      nodes={workflowNodes}
      connections={workflowConnections}
      mermaid={mermaid}
      editable={false}
    />
  );
}

function variationKeyword(variation: AdVariation) {
  if (variation.keywordUsed) return variation.keywordUsed;
  const parts = [variation.headline, variation.primaryText]
    .join(" ")
    .match(/\b(?:oversized|graphic|cotton|premium|streetwear|running|sneakers|sports|candles|fitness|coach|clinic)[^.,]{0,42}/i);
  return parts?.[0]?.trim() || variation.headline;
}

function rankTone(rank: number) {
  if (rank === 1) return "bg-black text-white";
  if (rank <= 3) return "bg-emerald-50 text-emerald-700";
  if (rank <= 6) return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

function variationForecast(variation: AdVariation, cpm: number) {
  const impressions = 10000;
  const spend = (impressions / 1000) * cpm;
  const clicks = Math.round(impressions * (variation.ctrPrediction / 100));
  const conversions = Math.max(1, Math.round(clicks * (variation.conversionRate / 100)));
  return {
    impressions,
    clicks,
    conversions,
    spend,
    cpc: spend / Math.max(clicks, 1),
    cpa: spend / Math.max(conversions, 1),
  };
}

function RankedAdPreview({
  variation,
  rank,
  selected,
  currency,
  cpm,
  platform,
  isOpening,
  onSelect,
}: {
  variation: AdVariation;
  rank: number;
  selected: boolean;
  currency: string;
  cpm: number;
  platform: PreviewPlatform;
  isOpening: boolean;
  onSelect: () => void;
}) {
  const forecast = variationForecast(variation, cpm);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selected ? "border-black ring-2 ring-black/10" : "border-zinc-200"}`}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 p-4">
        <div>
          <p className="text-sm font-black">Your Brand</p>
          <p className="text-xs font-semibold text-zinc-500">{platformLabel(platform)} · Live placement preview</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${rankTone(rank)}`}>
          {isOpening && <Loader2 className="h-3 w-3 animate-spin" />}
          Rank #{rank}
        </span>
      </div>
      <PlatformAdPreview variation={variation} platform={platform} rank={rank} />
      <div className="grid grid-cols-4 gap-px bg-zinc-100 text-center">
        <div className="bg-white p-3"><Metric label="Score" value={`${variation.adQualityScore}/10`} /></div>
        <div className="bg-white p-3"><Metric label="CTR" value={`${variation.ctrPrediction}%`} /></div>
        <div className="bg-white p-3"><Metric label="Conv." value={forecast.conversions.toLocaleString()} /></div>
        <div className="bg-white p-3"><Metric label="CPA" value={formatMoney(forecast.cpa, currency)} /></div>
      </div>
    </div>
  );
}

function platformLabel(platform: PreviewPlatform) {
  if (platform === "facebook") return "Facebook Feed";
  if (platform === "instagram") return "Instagram Ad";
  if (platform === "whatsapp") return "WhatsApp Click-to-message";
  return "Web/App placement";
}

function PlatformAdPreview({ variation, platform, rank }: { variation: AdVariation; platform: PreviewPlatform; rank: number }) {
  if (platform === "instagram") return <InstagramPlacement variation={variation} rank={rank} />;
  if (platform === "whatsapp") return <WhatsAppPlacement variation={variation} rank={rank} />;
  if (platform === "webapp") return <WebAppPlacement variation={variation} rank={rank} />;
  return <FacebookPlacement variation={variation} rank={rank} />;
}

function CreativeVisual({ variation, compact = false }: { variation: AdVariation; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${compact ? "h-44" : "aspect-[1.18]"} bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,#ffedd5,#ecfdf5_48%,#dbeafe)]`}>
      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 shadow-sm">MetaBuddy</div>
      <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/86 p-4 text-left shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-600">{variation.angle}</p>
        <h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight text-zinc-950">{variation.headline}</h3>
        <p className="mt-2 line-clamp-1 text-xs font-bold text-zinc-500">{variationKeyword(variation)}</p>
      </div>
      <div className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-xl">
        <ShoppingBag className="h-7 w-7" />
      </div>
    </div>
  );
}

function FacebookPlacement({ variation, rank }: { variation: AdVariation; rank: number }) {
  return (
    <div className="bg-[#f0f2f5] p-3">
      <div className="overflow-hidden rounded-lg border border-[#dddfe2] bg-white text-[#050505] shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]"><ShoppingBag className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold">Your Brand</p>
            <p className="text-[11px] font-semibold text-[#65676b]">Sponsored · <span className="align-middle">🌐</span></p>
          </div>
          <MoreHorizontal className="ml-auto h-5 w-5 text-[#65676b]" />
        </div>
        <p className="px-3 pb-3 text-[13px] leading-[1.35]">{variation.primaryText}</p>
        <CreativeVisual variation={variation} />
        <div className="flex items-center justify-between gap-3 bg-[#f0f2f5] px-3 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-[#65676b]">yourbrand.com</p>
            <p className="truncate text-[14px] font-bold">{variation.headline}</p>
            <p className="truncate text-[12px] text-[#65676b]">{variation.description}</p>
          </div>
          <span className="shrink-0 rounded-md bg-[#e4e6eb] px-3 py-2 text-[12px] font-bold text-[#050505]">{variation.cta.replaceAll("_", " ")}</span>
        </div>
        <div className="flex items-center justify-between border-t border-[#e4e6eb] px-4 py-2 text-[12px] font-bold text-[#65676b]">
          <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {1_200 + rank * 83}</span>
          <span>{24 + rank} comments · {8 + rank} shares</span>
        </div>
      </div>
    </div>
  );
}

function InstagramPlacement({ variation, rank }: { variation: AdVariation; rank: number }) {
  return (
    <div className="bg-white p-3">
      <div className="overflow-hidden rounded-[18px] border border-zinc-200 bg-white text-[#262626] shadow-sm">
        <div className="flex items-center gap-3 p-3">
          <div className="h-9 w-9 rounded-full bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)] p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-orange-600"><ShoppingBag className="h-4 w-4" /></div>
          </div>
          <div>
            <p className="text-[13px] font-bold">yourbrand</p>
            <p className="text-[11px] font-semibold">Sponsored</p>
          </div>
          <MoreHorizontal className="ml-auto h-5 w-5" />
        </div>
        <CreativeVisual variation={variation} compact />
        <div className="p-3">
          <div className="mb-2 flex items-center gap-4">
            <Heart className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
            <Send className="h-6 w-6" />
          </div>
          <p className="text-[13px] font-bold">{1_840 + rank * 61} likes</p>
          <p className="mt-1 line-clamp-3 text-[13px] leading-[1.35]"><span className="font-bold">yourbrand</span> {variation.primaryText}</p>
          <span className="mt-3 block w-full rounded-lg bg-[#0095f6] py-2 text-center text-[13px] font-bold text-white">{variation.cta.replaceAll("_", " ")}</span>
        </div>
      </div>
    </div>
  );
}

function WhatsAppPlacement({ variation }: { variation: AdVariation; rank: number }) {
  return (
    <div className="bg-[#e5ddd5] p-3">
      <div className="overflow-hidden rounded-[22px] border border-emerald-100 bg-[#efeae2] shadow-sm">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><MessageCircle className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-black">Your Brand</p>
            <p className="text-[11px] font-semibold text-white/70">Sponsored message preview</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-3 text-left shadow-sm">
            <p className="text-[13px] font-semibold leading-5 text-zinc-900">{variation.primaryText}</p>
          </div>
          <div className="ml-auto max-w-[86%] overflow-hidden rounded-2xl rounded-tr-sm bg-white shadow-sm">
            <CreativeVisual variation={variation} compact />
            <div className="p-3 text-left">
              <p className="text-sm font-black text-zinc-950">{variation.headline}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">{variation.description}</p>
              <span className="mt-3 block w-full rounded-lg bg-[#25d366] py-2 text-center text-xs font-black text-white">Message on WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebAppPlacement({ variation }: { variation: AdVariation; rank: number }) {
  return (
    <div className="bg-zinc-100 p-3">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 text-[10px] font-bold text-zinc-400">yourbrand.com/ad</span>
        </div>
        <div className="grid gap-3 p-4">
          <CreativeVisual variation={variation} compact />
          <div className="text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">{variation.bestFor}</p>
            <h3 className="mt-2 text-xl font-black leading-tight text-zinc-950">{variation.headline}</h3>
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-zinc-600">{variation.primaryText}</p>
            <span className="mt-4 inline-flex rounded-lg bg-zinc-950 px-4 py-2 text-xs font-black text-white">{variation.cta.replaceAll("_", " ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function VariationCopyBlock({ variation, best }: { variation: AdVariation; best: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-lg font-black">{variation.headline}</p>
        {best && <span className="rounded-full bg-black px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">Best</span>}
      </div>
      <p className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-400">{variation.name} · {variation.angle}</p>
      <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-zinc-700">{variation.primaryText}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">Keyword: {variationKeyword(variation)}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">CTA: {variation.cta.replaceAll("_", " ")}</span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{variation.bestFor}</span>
      </div>
    </div>
  );
}

function VariationForecastBlock({ variation, currency, cpm }: { variation: AdVariation; currency: string; cpm: number }) {
  const forecast = variationForecast(variation, cpm);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric label="Score" value={`${variation.adQualityScore}/10`} />
      <Metric label="CTR" value={`${variation.ctrPrediction}%`} />
      <Metric label="Conversions" value={forecast.conversions.toLocaleString()} />
      <Metric label="Clicks" value={forecast.clicks.toLocaleString()} />
      <Metric label="CPC" value={formatMoney(forecast.cpc, currency)} />
      <Metric label="CPA" value={formatMoney(forecast.cpa, currency)} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{label}</p><p className="mt-1 text-sm font-black">{value}</p></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="p-12 text-center text-sm font-semibold text-zinc-500">{text}</div>;
}

function formatMoney(value: number, currency: string) {
  const amount = currency === "INR" ? Math.round(value).toLocaleString() : value.toFixed(2);
  return `₹${amount}`;
}

function LaunchForecastReport({ intelligence, audit }: { intelligence: Intelligence | null; audit: AgentOutput | null }) {
  if (!intelligence?.forecast || !intelligence.bestAd) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <BarChart3 className="mx-auto mb-4 h-10 w-10 text-zinc-300" />
        <h2 className="text-xl font-black">Run the pipeline to generate a Meta launch forecast</h2>
        <p className="mt-2 text-sm font-semibold text-zinc-500">Predicted reach, clicks, conversions, spend, CPC, CPA, and risks will appear here.</p>
      </div>
    );
  }

  const forecast = intelligence.forecast;
  const auditRecord = asRecord(audit);
  const risks = asStringArray(auditRecord.risks);
  const fixes = asStringArray(auditRecord.recommendedFixes);
  const missing = asStringArray(auditRecord.missingInputs);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Meta launch forecast</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black">Predicted performance before going live</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-500">{forecast.basis}. Best ad: {intelligence.bestAd.name} using “{intelligence.bestAd.headline}”.</p>
          </div>
          <div className="rounded-lg bg-black px-5 py-4 text-white">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Launch confidence</p>
            <p className="mt-1 text-3xl font-black">{forecast.confidence}%</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ForecastMetric label="Predicted reach" value={forecast.reach.toLocaleString()} helper={`Frequency ${forecast.frequency}x`} />
        <ForecastMetric label="Impressions" value={forecast.impressions.toLocaleString()} helper="Simulation volume" />
        <ForecastMetric label="Link clicks" value={forecast.clicks.toLocaleString()} helper={`${forecast.ctr}% predicted CTR`} />
        <ForecastMetric label="Conversions" value={forecast.conversions.toLocaleString()} helper={`${forecast.conversionRate}% post-click`} />
        <ForecastMetric label="Estimated spend" value={formatMoney(forecast.spend, forecast.currency)} helper={`${formatMoney(forecast.assumedCpm, forecast.currency)} CPM assumed`} />
        <ForecastMetric label="Estimated CPC" value={formatMoney(forecast.cpc, forecast.currency)} helper="Cost per link click" />
        <ForecastMetric label="Estimated CPA" value={formatMoney(forecast.cpa, forecast.currency)} helper="Cost per conversion" />
        <ForecastMetric label="Engagements" value={forecast.engagements.toLocaleString()} helper={`${forecast.engagementRate}% engagement rate`} />
      </div>

      <SimilarMetaAdsPanel similarMetaAds={intelligence.similarMetaAds} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Recommendation</p>
          <h3 className="mt-2 text-xl font-black">{forecast.recommendation}</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="Saves" value={forecast.saves.toLocaleString()} />
            <Metric label="Shares" value={forecast.shares.toLocaleString()} />
            <Metric label="Risk" value={intelligence.riskLevel || "Pending"} />
          </div>
          <div className="mt-5 grid gap-2">
            {intelligence.insights.slice(0, 5).map((insight) => (
              <p key={insight} className="rounded-lg bg-zinc-50 px-4 py-3 text-sm font-semibold leading-6 text-zinc-700">{insight}</p>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {(missing.length > 0 || risks.length > 0 || fixes.length > 0) && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Before launch</p>
              {missing.length > 0 && <BulletBlock title="Missing inputs" items={missing} />}
              {risks.length > 0 && <BulletBlock title="Risks" items={risks} />}
              {fixes.length > 0 && <BulletBlock title="Recommended fixes" items={fixes} />}
            </div>
          )}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Forecast assumptions</p>
            <div className="mt-3 grid gap-2">
              {forecast.assumptions.map((item) => (
                <p key={item} className="text-sm font-semibold leading-6 text-zinc-600">{item}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarMetaAdsPanel({ similarMetaAds }: { similarMetaAds: Intelligence["similarMetaAds"] }) {
  const ads = similarMetaAds?.ads || [];
  if (ads.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Similar ads in Meta</p>
          <h3 className="mt-2 text-xl font-black">{similarMetaAds?.liveAvailable ? "Live Meta Ad Library matches" : "Meta Ads Library research links"}</h3>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-500">{similarMetaAds?.note}</p>
        </div>
        {similarMetaAds?.libraryUrl && (
          <a href={similarMetaAds.libraryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-3 text-xs font-black text-white">
            Open Library <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ads.map((ad) => (
          <div key={ad.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black uppercase tracking-widest text-zinc-400">{ad.pageName}</p>
                <h4 className="mt-2 text-base font-black text-zinc-950">{ad.headline}</h4>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {ad.isLive ? "Live" : "Search"}
              </span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-zinc-600">{ad.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {ad.platforms.slice(0, 4).map((platform) => (
                <span key={`${ad.id}-${platform}`} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-zinc-500">{platform}</span>
              ))}
              {ad.searchTerm && <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-zinc-500">{ad.searchTerm}</span>}
            </div>
            <div className="mt-4 grid gap-2 text-xs font-semibold text-zinc-500">
              {ad.startDate && <p>Started: {ad.startDate}</p>}
              {ad.impressions && <p>Impressions: {formatMetaRange(ad.impressions)}</p>}
              {ad.spend && <p>Spend: {formatMetaRange(ad.spend)}</p>}
              <p>{ad.reason}</p>
            </div>
            <a href={ad.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-zinc-950">
              {ad.cta || "View Ads Library"} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMetaRange(value: string | Record<string, unknown>) {
  if (typeof value === "string") return value;
  const lower = value.lower_bound;
  const upper = value.upper_bound;
  if (typeof lower === "number" && typeof upper === "number") return `${lower.toLocaleString()}-${upper.toLocaleString()}`;
  return "Available in Meta";
}

function ForecastMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="mt-2 text-xs font-semibold text-zinc-500">{helper}</p>
    </div>
  );
}

function AdPreview({ ad }: { ad?: AdVariation }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 p-4"><p className="text-xs font-black uppercase tracking-widest text-zinc-400">Creative preview</p></div>
      <div className="bg-[#f0f2f5] p-4">
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="p-4"><p className="text-sm font-black">Your Brand</p><p className="text-xs font-semibold text-zinc-500">Promoted</p></div>
          <p className="px-4 pb-4 text-sm font-semibold leading-6 text-zinc-800">{ad?.primaryText || "Run agents to preview the recommended ad."}</p>
          <div className="flex aspect-square items-center justify-center bg-zinc-100"><ImageIcon className="h-10 w-10 text-zinc-300" /></div>
          <div className="flex items-center justify-between gap-3 bg-zinc-50 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-black">{ad?.headline || "Headline"}</p><p className="truncate text-xs font-semibold text-zinc-500">{ad?.description || "Description"}</p></div><span className="rounded-md bg-black px-3 py-2 text-xs font-black text-white">{(ad?.cta || "LEARN_MORE").replaceAll("_", " ")}</span></div>
        </div>
      </div>
    </div>
  );
}
