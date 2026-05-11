"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Globe2,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShoppingBag,
  Sparkles,
  ThumbsUp,
} from "lucide-react";

import { ApiError, api } from "@/lib/api";

type PreviewPlatform = "facebook" | "instagram" | "whatsapp" | "webapp";

type AdVariation = {
  id: string;
  name?: string;
  bestFor?: string;
  primaryText: string;
  headline: string;
  description?: string;
  cta?: string;
  angle?: string;
  adQualityScore?: number;
  ctrPrediction?: number;
  conversionRate?: number;
  riskScore?: number;
  rank?: number;
  keywordUsed?: string;
};

type PreviewDraft = {
  _id: string;
  variation: AdVariation;
  platform: PreviewPlatform;
  rank: number;
  currency: string;
  cpm: number;
  status: string;
  launchConfig?: {
    pageId?: string;
    websiteUrl?: string;
    imageUrl?: string;
    country?: string;
    dailyBudget?: number;
  };
  meta?: {
    campaignId?: string;
    adSetId?: string;
    creativeId?: string;
    adId?: string;
    status?: string;
  };
  failureReason?: string;
};

type PublishResult = {
  success?: boolean;
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
  adId?: string;
  status?: string;
  preview?: PreviewDraft;
};

function variationKeyword(variation: AdVariation) {
  return variation.keywordUsed || variation.name || variation.angle || "Generated creative";
}

function ctaLabel(value?: string) {
  return (value || "SHOP_NOW").replaceAll("_", " ");
}

function normalizeCta(value?: string) {
  const normalized = String(value || "SHOP_NOW").toUpperCase().replace(/\s+/g, "_");
  if (["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "CONTACT_US", "BOOK_NOW", "GET_QUOTE", "APPLY_NOW", "DOWNLOAD"].includes(normalized)) return normalized;
  return "SHOP_NOW";
}

function platformLabel(platform: PreviewPlatform) {
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  if (platform === "whatsapp") return "WhatsApp";
  return "Web/App";
}

function CreativeVisual({ variation, compact = false }: { variation: AdVariation; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${compact ? "h-72" : "aspect-[1.18]"} bg-[radial-gradient(circle_at_28%_20%,rgba(255,255,255,0.95),transparent_24%),linear-gradient(135deg,#ffedd5,#ecfdf5_48%,#dbeafe)]`}>
      <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500 shadow-sm">MetaBuddy</div>
      <div className="absolute right-5 top-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-950 text-white shadow-xl">
        <ShoppingBag className="h-9 w-9" />
      </div>
      <div className="absolute inset-x-6 bottom-6 rounded-3xl bg-white/88 p-5 text-left shadow-[0_20px_54px_rgba(15,23,42,0.14)] backdrop-blur">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">{variation.angle || "Generated angle"}</p>
        <h3 className="mt-2 text-2xl font-black leading-tight text-zinc-950">{variation.headline}</h3>
        <p className="mt-3 text-sm font-bold text-zinc-500">{variationKeyword(variation)}</p>
      </div>
    </div>
  );
}

function PlacementPreview({ variation, platform, rank }: { variation: AdVariation; platform: PreviewPlatform; rank: number }) {
  if (platform === "instagram") {
    return (
      <div className="mx-auto max-w-[460px] overflow-hidden rounded-[24px] border border-zinc-200 bg-white text-[#262626] shadow-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="h-11 w-11 rounded-full bg-[linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)] p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-orange-600"><ShoppingBag className="h-5 w-5" /></div>
          </div>
          <div><p className="text-sm font-bold">yourbrand</p><p className="text-xs font-semibold">Sponsored</p></div>
          <MoreHorizontal className="ml-auto h-5 w-5" />
        </div>
        <CreativeVisual variation={variation} compact />
        <div className="p-4">
          <div className="mb-3 flex items-center gap-4"><Heart className="h-7 w-7" /><MessageCircle className="h-7 w-7" /><Send className="h-7 w-7" /></div>
          <p className="text-sm font-bold">{1_840 + rank * 61} likes</p>
          <p className="mt-2 text-sm leading-6"><span className="font-bold">yourbrand</span> {variation.primaryText}</p>
          <span className="mt-4 block w-full rounded-lg bg-[#0095f6] py-3 text-center text-sm font-bold text-white">{ctaLabel(variation.cta)}</span>
        </div>
      </div>
    );
  }

  if (platform === "whatsapp") {
    return (
      <div className="mx-auto max-w-[460px] overflow-hidden rounded-[28px] border border-emerald-100 bg-[#efeae2] shadow-sm">
        <div className="flex items-center gap-3 bg-[#075e54] px-5 py-4 text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"><MessageCircle className="h-6 w-6" /></div>
          <div><p className="text-base font-black">Your Brand</p><p className="text-xs font-semibold text-white/70">Sponsored message preview</p></div>
        </div>
        <div className="space-y-4 p-5">
          <div className="ml-auto max-w-[86%] rounded-2xl rounded-tr-sm bg-[#dcf8c6] p-4 text-left shadow-sm"><p className="text-sm font-semibold leading-6 text-zinc-900">{variation.primaryText}</p></div>
          <div className="ml-auto max-w-[86%] overflow-hidden rounded-2xl rounded-tr-sm bg-white shadow-sm">
            <CreativeVisual variation={variation} compact />
            <div className="p-4 text-left"><p className="text-base font-black text-zinc-950">{variation.headline}</p><p className="mt-1 text-sm font-semibold text-zinc-500">{variation.description}</p><span className="mt-4 block w-full rounded-lg bg-[#25d366] py-3 text-center text-sm font-black text-white">Message on WhatsApp</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (platform === "webapp") {
    return (
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-emerald-400" /><span className="ml-3 text-xs font-bold text-zinc-400">yourbrand.com/ad</span></div>
        <div className="grid gap-5 p-5 md:grid-cols-[1.1fr_0.9fr]">
          <CreativeVisual variation={variation} compact />
          <div className="flex flex-col justify-center text-left"><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">{variation.bestFor}</p><h3 className="mt-3 text-3xl font-black leading-tight text-zinc-950">{variation.headline}</h3><p className="mt-4 text-sm font-semibold leading-7 text-zinc-600">{variation.primaryText}</p><span className="mt-5 inline-flex w-fit rounded-lg bg-zinc-950 px-5 py-3 text-sm font-black text-white">{ctaLabel(variation.cta)}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[620px] bg-[#f0f2f5] p-4">
      <div className="overflow-hidden rounded-lg border border-[#dddfe2] bg-white text-[#050505] shadow-sm">
        <div className="flex items-center gap-3 p-4"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e7f3ff] text-[#1877f2]"><ShoppingBag className="h-5 w-5" /></div><div className="min-w-0"><p className="text-sm font-bold">Your Brand</p><p className="text-xs font-semibold text-[#65676b]">Sponsored · globe</p></div><MoreHorizontal className="ml-auto h-5 w-5 text-[#65676b]" /></div>
        <p className="px-4 pb-4 text-sm leading-6">{variation.primaryText}</p>
        <CreativeVisual variation={variation} />
        <div className="flex items-center justify-between gap-3 bg-[#f0f2f5] px-4 py-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-[#65676b]">yourbrand.com</p><p className="truncate text-base font-bold">{variation.headline}</p><p className="truncate text-sm text-[#65676b]">{variation.description}</p></div><span className="shrink-0 rounded-md bg-[#e4e6eb] px-4 py-2 text-sm font-bold text-[#050505]">{ctaLabel(variation.cta)}</span></div>
        <div className="flex items-center justify-between border-t border-[#e4e6eb] px-5 py-3 text-sm font-bold text-[#65676b]"><span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {1_200 + rank * 83}</span><span>{24 + rank} comments · {8 + rank} shares</span></div>
      </div>
    </div>
  );
}

export default function AdCreativePreviewDetailPage() {
  const params = useParams<{ id: string }>();
  const previewId = params.id;
  const [draft, setDraft] = useState<PreviewDraft | null>(null);
  const [platform, setPlatform] = useState<PreviewPlatform>("facebook");
  const [pageId, setPageId] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [dailyBudget, setDailyBudget] = useState("500");
  const [country, setCountry] = useState("IN");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      setIsLoading(true);
      setError("");
      try {
        const response = await api.getAdCreativePreview(previewId) as { preview: PreviewDraft };
        if (!active) return;
        const preview = response.preview;
        setDraft(preview);
        setPlatform(preview.platform || "facebook");
        setPageId(preview.launchConfig?.pageId || "");
        setWebsiteUrl(preview.launchConfig?.websiteUrl || "");
        setImageUrl(preview.launchConfig?.imageUrl || "");
        setCountry(preview.launchConfig?.country || "IN");
        setDailyBudget(String(preview.launchConfig?.dailyBudget || 500));
        if (preview.meta?.campaignId) setPublishResult({ ...preview.meta, success: true });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load preview");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadPreview();
    return () => {
      active = false;
    };
  }, [previewId]);

  const variation = draft?.variation;
  const rank = draft?.rank || variation?.rank || 1;
  const cta = useMemo(() => normalizeCta(variation?.cta), [variation?.cta]);

  function validatePublishFields() {
    if (!pageId.trim()) return "Facebook Page ID is required.";
    if (!websiteUrl.trim()) return "Destination website URL is required.";
    if (!imageUrl.trim() && !imageHash.trim()) return "A public image URL or Meta image hash is required.";
    return "";
  }

  async function publishToMeta() {
    if (!variation) return;
    const validation = validatePublishFields();
    if (validation) {
      setPublishError(validation);
      setShowConfirm(false);
      return;
    }
    setIsPublishing(true);
    setPublishError("");
    setPublishResult(null);
    try {
      const result = await api.publishAdCreativePreviewToMeta(previewId, {
        pageId: pageId.trim(),
        websiteUrl: websiteUrl.trim(),
        imageUrl: imageUrl.trim(),
        imageHash: imageHash.trim(),
        country: country || "IN",
        dailyBudget: Number(dailyBudget) || 500,
        objective: "OUTCOME_SALES",
        callToActionType: cta,
      }) as PublishResult;
      setPublishResult(result);
      if (result.preview) setDraft(result.preview);
      setShowConfirm(false);
    } catch (err) {
      setPublishError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Meta publish failed.");
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-zinc-50"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></main>;
  }

  if (!variation || error) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6 text-zinc-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-zinc-300" />
          <h1 className="mt-4 text-2xl font-black">Preview draft unavailable</h1>
          <p className="mt-2 text-sm font-semibold text-zinc-500">{error || "Go back and open a ranked creative again."}</p>
          <Link href="/ad-creatives" className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white">Back to previews</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-950">
      <div className="border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/ad-creatives" className="inline-flex items-center gap-2 text-sm font-black text-zinc-600 hover:text-black"><ArrowLeft className="h-4 w-4" /> Back to ranked previews</Link>
          <span className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">Rank #{rank}</span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-400">Full placement preview</p><h1 className="mt-2 text-3xl font-black tracking-tight">{variation.headline}</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-zinc-500">{variation.primaryText}</p></div>
            <div className="grid gap-2 sm:grid-cols-4">
              {(["facebook", "instagram", "whatsapp", "webapp"] as PreviewPlatform[]).map((item) => (
                <button key={item} type="button" onClick={() => setPlatform(item)} className={`rounded-lg border px-3 py-2 text-left text-xs font-black transition ${platform === item ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}>{platformLabel(item)}</button>
              ))}
            </div>
          </div>
          <PlacementPreview variation={variation} platform={platform} rank={rank} />
        </section>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Sparkles className="h-5 w-5" /></div><div><p className="text-lg font-black">Post to Meta</p><p className="text-xs font-semibold text-zinc-500">Creates a paused campaign, ad set, creative, and ad.</p></div></div>
          <div className="mt-5 grid gap-4">
            <label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Facebook Page ID</span><input value={pageId} onChange={(event) => setPageId(event.target.value)} placeholder="1234567890" className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label>
            <label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Destination URL</span><input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://yourbrand.com/product" className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label>
            <label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Public image URL</span><input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label>
            <label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Meta image hash optional</span><input value={imageHash} onChange={(event) => setImageHash(event.target.value)} placeholder="Use instead of image URL if already uploaded" className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label>
            <div className="grid grid-cols-2 gap-3"><label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Daily budget</span><input value={dailyBudget} onChange={(event) => setDailyBudget(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label><label><span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Country</span><input value={country} onChange={(event) => setCountry(event.target.value.toUpperCase())} maxLength={2} className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-black" /></label></div>
          </div>
          {publishError && <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{publishError}</div>}
          {publishResult && <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4"><p className="flex items-center gap-2 text-sm font-black text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Created in Meta as paused</p><div className="mt-3 grid gap-2 text-xs font-bold text-emerald-900"><p>Campaign: {publishResult.campaignId}</p><p>Ad set: {publishResult.adSetId}</p><p>Creative: {publishResult.creativeId}</p><p>Ad: {publishResult.adId}</p></div>{publishResult.campaignId && <Link href={`/meta-campaign/${publishResult.campaignId}`} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-emerald-900">Open campaign <ExternalLink className="h-3.5 w-3.5" /></Link>}</div>}
          <button type="button" onClick={() => { const validation = validatePublishFields(); if (validation) setPublishError(validation); else setShowConfirm(true); }} disabled={isPublishing} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-black text-white transition hover:bg-zinc-800 disabled:opacity-60"><Globe2 className="h-4 w-4" /> Review and create paused Meta ad</button>
          <p className="mt-3 text-xs font-semibold leading-5 text-zinc-500">Requires a valid Meta Ads V2 connection, selected ad account, Page access, billing, and ads_management permission.</p>
        </aside>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-black">Confirm Meta publish</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">This will create a real Meta campaign, ad set, creative, and ad in PAUSED status.</p>
            <div className="mt-5 grid gap-2 rounded-xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-700"><p>Page ID: {pageId}</p><p>Destination: {websiteUrl}</p><p>Creative: {variation.headline}</p><p>Budget: {dailyBudget} / day</p><p>Country: {country}</p></div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setShowConfirm(false)} className="rounded-full border border-zinc-200 px-5 py-2 text-sm font-black text-zinc-700">Cancel</button><button type="button" onClick={publishToMeta} disabled={isPublishing} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-black text-white disabled:opacity-60">{isPublishing && <Loader2 className="h-4 w-4 animate-spin" />} Create paused ad</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
