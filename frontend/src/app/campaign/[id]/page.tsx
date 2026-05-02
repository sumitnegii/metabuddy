"use client";
import { useEffect, useState, use } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { AdCopy, Campaign, PerfData } from "@/types/index";
import Link from "next/link";
import { 
  PenTool, Layers, Palette, TrendingUp, CheckCircle2, Copy, ChevronLeft,
  Activity, Sparkles, X, ShieldCheck, Cpu, Globe, Rocket, LineChart, Camera,
  ExternalLink, ArrowRight, Wand2
} from "lucide-react";
import AdPreview from "@/components/ads/RealAdPreview";

type CampaignStatus = Campaign["status"] | "idea_pending";
type CampaignWithDraftStatus = Omit<Campaign, "status"> & { status: CampaignStatus };
type CampaignAd = AdCopy & { latestPerformance?: Partial<PerfData> };

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<CampaignWithDraftStatus | null>(null);
  const [adsPerformance, setAdsPerformance] = useState<CampaignAd[]>([]);
  const [tab, setTab] = useState("content");
  const [copied, setCopied] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStep, setPublishStep] = useState(0);
  const [publishingPlatform, setPublishingPlatform] = useState("");
  const [selectedAdForPublish, setSelectedAdForPublish] = useState<AdCopy | null>(null);
  const [viewingAd, setViewingAd] = useState<AdCopy | null>(null);
  const [postingToMeta, setPostingToMeta] = useState(false);

  useEffect(() => { 
    api.getCampaign(id).then((campaign) => setC(campaign as CampaignWithDraftStatus)); 
    api.getCampaignAds(id).then(setAdsPerformance);
  }, [id]);

  const topAd = [...adsPerformance].sort((a, b) => (b.latestPerformance?.ctr || 0) - (a.latestPerformance?.ctr || 0))[0];
  
  const PUBLISH_STEPS = [
    { label: "Safety Check", agent: "LawBot", icon: ShieldCheck, detail: "Checking ad policy compliance..." },
    { label: "Asset Lock", agent: "AssetAgent", icon: Palette, detail: "Optimizing creative hooks..." },
    { label: "Launch", agent: "Launcher", icon: Rocket, detail: "Preparing the campaign for publishing..." }
  ];

  const handlePublish = async () => {
    if (!selectedAdForPublish) return;
    setIsPublishing(true);
    setPublishStep(0);
    for (let i = 0; i < PUBLISH_STEPS.length; i++) {
      setPublishStep(i);
      await new Promise(r => setTimeout(r, 1500));
    }
    try {
      await api.publishAd({
        campaignId: id,
        generatedCopyId: selectedAdForPublish.copyId,
        platform: publishingPlatform.toLowerCase(),
        adCopy: selectedAdForPublish.body,
        headline: selectedAdForPublish.headline,
        hook: selectedAdForPublish.hook,
        cta: selectedAdForPublish.cta
      });
      const updated = await api.getCampaign(id);
      setC(updated);
      setTab("content");
      setIsPublishing(false);
      setSelectedAdForPublish(null);
    } catch {
      setIsPublishing(false);
    }
  };


  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id); 
    setTimeout(() => setCopied(""), 2000);
  };

  const handleSync = async () => {
    try {
      const camp = await api.getCampaign(id);
      setC(camp as CampaignWithDraftStatus);
      const updatedAds = await api.getCampaignAds(id);
      setAdsPerformance(updatedAds);
    } catch {}
  };

  const handleGenerateFull = async () => {
    setIsPublishing(true);
    setPublishStep(0);
    try {
      const res = await api.generateFullCampaign(id);
      setC(res as CampaignWithDraftStatus);
      setIsPublishing(false);
    } catch (err) {
      setIsPublishing(false);
      alert("Generation failed: " + (err as Error).message);
    }
  };

  const handleCreateMetaCampaign = async () => {
    if (!c) return;
    setPostingToMeta(true);
    try {
      await api.createMetaAdsV2Campaign({
        name: c.idea,
        idea: c.idea,
        objective: "OUTCOME_TRAFFIC",
      });
      window.location.href = "/campaigns";
    } catch (err) {
      alert("Meta campaign creation failed: " + (err as Error).message);
    } finally {
      setPostingToMeta(false);
    }
  };

  if (!c) return (

    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="ml-[90px] flex flex-1 items-center justify-center">
        <div className="w-10 h-10 border-4 border-zinc-100 border-t-black rounded-full animate-spin" />
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-12 animate-in">
        
        {/* Header */}
        <header className="flex items-end justify-between mb-12">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="p-4 rounded-3xl bg-white border border-zinc-100 text-zinc-400 hover:text-black hover:shadow-md transition-all">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-4xl font-black tracking-tighter">{c.idea}</h1>
                <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest ${
                  c.status === 'ready' ? 'bg-black text-white' : 
                  c.status === 'tracking' ? 'bg-[#FFCC00] text-black' : 
                  'bg-zinc-200 text-black'
                }`}>
                  {c.status}
                </span>
              </div>
              <p className="text-lg font-bold text-zinc-400 mt-2">{c.ideaExpansion?.industry || "Marketing"} • {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "New campaign"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {c.status === 'idea_pending' ? (
              <button onClick={() => handleGenerateFull()} className="btn-primary h-12 px-8">
                <Sparkles className="w-5 h-5" />
                Build Full Strategy
              </button>
            ) : (
              <>
                <button onClick={() => handleSync()} className="btn-secondary h-12">
                  <Activity className="w-4.5 h-4.5" />
                  Refresh
                </button>
                <button onClick={handleCreateMetaCampaign} disabled={postingToMeta} className="btn-secondary h-12">
                  <Rocket className="w-4.5 h-4.5" />
                  {postingToMeta ? "Creating" : "Create in Meta"}
                </button>
              </>
            )}
            <Link href={`/campaign/${id}/analytics`} className="btn-primary h-12">

              <LineChart className="w-5 h-5" />
              Analytics
            </Link>
          </div>

        </header>

        {/* Top Performer Summary */}
        {topAd && (
          <div className="saas-card p-12 mb-12">
            <div className="flex items-start justify-between">
              <div className="space-y-8 max-w-2xl">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-50 text-[11px] font-black text-emerald-600 uppercase tracking-widest">
                  <TrendingUp className="w-4 h-4" />
                  Winner Variant
                </div>
                <h3 className="text-5xl font-black tracking-tight leading-tight">{topAd.headline}</h3>
                <p className="text-zinc-400 text-xl font-bold leading-relaxed italic">&quot;{topAd.hook}&quot;</p>
              </div>
              <div className="flex gap-20">
                {[
                  { label: "CTR", value: `${topAd.latestPerformance?.ctr}%`, trend: "+2.4%" },
                  { label: "Leads", value: topAd.latestPerformance?.leads, trend: "+12" },
                  { label: "CPL", value: `₹${topAd.latestPerformance?.cpc}`, trend: "Low" },
                ].map((stat, i) => (
                  <div key={i} className="text-right">
                    <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">{stat.label}</p>
                    <p className="text-4xl font-black mt-3">{stat.value}</p>
                    <p className="text-xs font-black text-emerald-500 mt-2">{stat.trend}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-12 mb-12">
          {[
            { id: "content", label: "Content Kit", icon: PenTool },
            { id: "strategy", label: "Plan", icon: Layers },
            { id: "creative", label: "Visuals", icon: Palette },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                flex items-center gap-3 pb-6 text-sm font-black uppercase tracking-widest transition-all relative
                ${tab === t.id ? "text-black" : "text-zinc-300 hover:text-black"}
              `}
            >
              <t.icon className={`w-5 h-5 ${tab === t.id ? "text-[#7c3aed]" : "text-zinc-300"}`} />
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-black rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab Content: Ad Matrix & Preview */}
        {tab === "content" && (
          c.status === 'idea_pending' ? (
            <div className="saas-card p-12 bg-white">
              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-7 space-y-10">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FFCC00] text-[11px] font-black text-black uppercase tracking-widest mb-4">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Analysis Complete
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-4">Marketing Foundation</h2>
                    <p className="text-zinc-500 text-lg font-bold italic leading-relaxed">&quot;{c.ideaExpansion?.marketAngle}&quot;</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Target Audience</h4>
                      <ul className="space-y-2">
                        {c.ideaExpansion?.targetAudience?.map((t: string, i: number) => (
                          <li key={i} className="flex items-center gap-3 text-sm font-bold text-zinc-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-black/10" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Key USPs</h4>
                      <ul className="space-y-2">
                        {c.ideaExpansion?.usp?.map((u: string, i: number) => (
                          <li key={i} className="flex items-center gap-3 text-sm font-bold text-zinc-600">
                            <CheckCircle2 className="w-4 h-4 text-black" />
                            {u}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-8 rounded-[32px] bg-zinc-50 border border-zinc-100">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Competitive Strategy</h4>
                    <p className="text-sm font-bold text-zinc-500 leading-relaxed">{c.ideaExpansion?.competitorInsights}</p>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col items-center justify-center text-center p-12 rounded-[40px] bg-black text-white shadow-2xl">
                  <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8">
                    <Cpu className="w-10 h-10 text-[#FFCC00]" />
                  </div>
                  <h3 className="text-2xl font-black mb-3">Ready to build the campaign kit?</h3>
                  <p className="text-zinc-400 text-[15px] font-bold mb-10 leading-relaxed px-6">
                    Build ad copy, captions, visual ideas, and a simple plan for launch and tracking.
                  </p>
                  <button onClick={() => handleGenerateFull()} className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-white px-8 text-[15px] font-black text-black transition-all hover:bg-zinc-200 active:scale-[0.98] w-full">
                    <Wand2 className="w-5 h-5" />
                    Build Full Strategy
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-10">
              {/* List Column */}
              <div className="col-span-5 space-y-6">
                <h3 className="text-xl font-black tracking-tight mb-4">Content Options</h3>
                {(Array.isArray(c.content?.adCopies) ? c.content.adCopies : []).map((ad, i) => {
                  const isActive = viewingAd?.copyId === ad.copyId;
                  return (
                    <button 
                      key={i} 
                      onClick={() => setViewingAd(ad)}
                      className={`w-full text-left p-6 rounded-[32px] border transition-all ${
                        isActive 
                          ? 'bg-white border-black shadow-xl ring-2 ring-black/5' 
                          : 'bg-white border-zinc-50 hover:border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          ad.funnelStage === 'awareness' ? 'bg-black text-white' :
                          ad.funnelStage === 'consideration' ? 'bg-[#FFCC00] text-black' :
                          'border border-black text-black'
                        }`}>
                          {ad.funnelStage}
                        </span>
                        <div className="flex items-center gap-2 text-zinc-400">
                          {ad.platform?.toLowerCase() === 'instagram' ? <Camera className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          <span className="text-[10px] font-bold">{ad.platform}</span>
                        </div>
                      </div>
                      <p className="text-sm font-black tracking-tight leading-snug line-clamp-2">{ad.headline}</p>
                      <div className="mt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-black" />
                           <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Optimized</span>
                         </div>
                         <ArrowRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1 text-black' : 'text-zinc-200'}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Preview Column */}
              <div className="col-span-7 sticky top-32 h-[700px]">
                {viewingAd ? (
                  <div className="h-full space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black tracking-tight">Channel Preview</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { setSelectedAdForPublish(viewingAd); setPublishingPlatform(viewingAd.platform === 'Instagram' ? 'Meta' : 'Google'); }}
                          className="btn-primary h-10 px-6 text-xs"
                        >
                          Mark Ready
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <AdPreview 
                      platform={viewingAd.platform}
                      headline={viewingAd.headline}
                      body={viewingAd.body}
                      cta={viewingAd.cta}
                      image={undefined}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-20 rounded-[40px] border-2 border-dashed border-zinc-200 bg-white">
                    <div className="w-20 h-20 rounded-full bg-zinc-50 flex items-center justify-center mb-8">
                      <Wand2 className="w-10 h-10 text-zinc-300" />
                    </div>
                    <p className="text-xl font-black text-black mb-2">Select content to preview</p>
                    <p className="text-sm font-bold text-zinc-500">See the message before deciding what to use.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {tab === "strategy" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-1 text-xl font-black tracking-tight">Campaign Plan</h3>
              <p className="mb-6 text-sm font-bold text-zinc-500">Simple goals by funnel stage so anyone can understand what the campaign is trying to do.</p>
              <div className="space-y-3">
                {(c.strategy?.funnel || []).map((stage) => (
                  <div key={stage.stage} className="grid gap-4 rounded-lg border border-zinc-100 bg-zinc-50 p-4 md:grid-cols-[1fr_1.2fr_0.8fr_auto] md:items-center">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Stage</p>
                      <p className="mt-1 font-black capitalize">{stage.stage}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Goal</p>
                      <p className="mt-1 text-sm font-bold text-zinc-600">{stage.goal}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">KPI</p>
                      <p className="mt-1 text-sm font-bold text-zinc-600">{stage.kpi}</p>
                    </div>
                    <div className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">{stage.budgetPercent}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-black tracking-tight">Budget and Targets</h3>
              <div className="space-y-4">
                {[
                  ["Suggested budget", c.strategy?.totalBudgetSuggestion || "Add after strategy is generated"],
                  ["Duration", c.strategy?.duration ? `${c.strategy.duration} days` : "Not set"],
                  ["Target CTR", c.strategy?.kpiTargets?.ctr || "Not set"],
                  ["Target CPL", c.strategy?.kpiTargets?.cpl || "Not set"],
                  ["Target reach", c.strategy?.kpiTargets?.reach || "Not set"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-zinc-100 pb-3 last:border-0">
                    <span className="text-sm font-bold text-zinc-500">{label}</span>
                    <span className="text-right text-sm font-black text-black">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "creative" && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
              <h3 className="mb-1 text-xl font-black tracking-tight">Creative Ideas</h3>
              <p className="mb-6 text-sm font-bold text-zinc-500">Use these for ads, creator briefs, reels, and social posts.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {(c.creative?.imageDescriptions || []).map((idea, index) => (
                  <div key={`${idea}-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">Visual {index + 1}</p>
                    <p className="text-sm font-bold leading-relaxed text-zinc-700">{idea}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-xl font-black tracking-tight">Social Hooks</h3>
              <div className="space-y-3">
                {(c.content?.hooks || []).slice(0, 6).map((hook, index) => (
                  <button key={`${hook}-${index}`} onClick={() => copy(hook, `hook_${index}`)} className="w-full rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-left text-sm font-bold leading-relaxed text-zinc-700 hover:border-zinc-300">
                    {hook}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Ad Preview Modal */}
      {viewingAd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/60 backdrop-blur-xl animate-in" onClick={() => setViewingAd(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-12 py-10 border-b border-zinc-50 flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Project Snapshot</h3>
              <button onClick={() => setViewingAd(null)} className="p-4 bg-zinc-100 rounded-full hover:bg-black hover:text-white transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-12 space-y-12">
              <div className="space-y-4">
                <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">Main Hook</p>
                <p className="text-4xl font-black tracking-tight leading-tight">{viewingAd.headline}</p>
              </div>
              <div className="space-y-4">
                <p className="text-xs font-black text-zinc-300 uppercase tracking-widest">Storytelling</p>
                <p className="text-zinc-500 leading-relaxed text-2xl font-bold">{viewingAd.body}</p>
              </div>
              {viewingAd.cta && (
                <button 
                  onClick={() => copy(viewingAd.cta, 'modal_cta')}
                  className="btn-primary w-full h-16 text-xl font-black"
                >
                  {viewingAd.cta}
                  {copied === 'modal_cta' ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6 opacity-30" />}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {selectedAdForPublish && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-12 bg-black/80 backdrop-blur-xl animate-in">
          <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-12 py-10 border-b border-zinc-50 flex items-center justify-between">
              <h3 className="text-2xl font-black tracking-tight">Prepare for {publishingPlatform}</h3>
              {!isPublishing && (
                <button onClick={() => setSelectedAdForPublish(null)} className="p-4 bg-zinc-100 rounded-full hover:bg-black hover:text-white transition-all">
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>

            <div className="p-12">
              {!isPublishing ? (
                <div className="space-y-10">
                  <div className="p-8 rounded-[32px] bg-zinc-50 text-lg font-bold text-zinc-500 leading-relaxed">
                    This will save the selected content as ready for {publishingPlatform}. You can publish from your ad or social account when you are ready.
                  </div>
                  <button onClick={handlePublish} className="btn-primary w-full h-16 text-xl font-black">
                    Mark as Ready
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="flex flex-col items-center gap-8 py-8">
                    <div className="w-20 h-20 border-8 border-zinc-100 border-t-black rounded-full animate-spin" />
                    <p className="text-xl font-black tracking-tight">Preparing {publishingPlatform} content...</p>
                  </div>
                  <div className="space-y-4">
                    {PUBLISH_STEPS.map((step, i) => (
                      <div key={i} className={`flex items-center justify-between p-6 rounded-[24px] transition-all duration-700 ${publishStep === i ? 'bg-black text-white shadow-xl' : publishStep > i ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-200'}`}>
                        <div className="flex items-center gap-5">
                          <step.icon className="w-6 h-6" />
                          <span className="text-sm font-black uppercase tracking-widest">{step.label}</span>
                        </div>
                        {publishStep > i && <CheckCircle2 className="w-5 h-5" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
