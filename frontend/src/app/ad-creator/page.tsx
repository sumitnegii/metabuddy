"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, ImageIcon, Loader2, PanelsTopLeft, Plus, Rocket, Trash2, Video } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";

type AdType = "IMAGE" | "VIDEO" | "CAROUSEL";

type CarouselCard = {
  name: string;
  description: string;
  link: string;
  imageUrl: string;
  imageHash: string;
};

const AD_TYPES: Array<{ value: AdType; label: string; icon: typeof ImageIcon }> = [
  { value: "IMAGE", label: "Image", icon: ImageIcon },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "CAROUSEL", label: "Carousel", icon: PanelsTopLeft },
];

const PREVIEW_FORMATS = [
  "DESKTOP_FEED_STANDARD",
  "MOBILE_FEED_STANDARD",
  "INSTAGRAM_STANDARD",
  "INSTAGRAM_STORY",
];

function emptyCard(index: number): CarouselCard {
  return {
    name: `Card ${index + 1}`,
    description: "",
    link: "",
    imageUrl: "",
    imageHash: "",
  };
}

function previewBody(response: unknown) {
  const data = response as { data?: Array<{ body?: string }> };
  return data?.data?.[0]?.body || "";
}

export default function AdCreatorPage() {
  const [adType, setAdType] = useState<AdType>("IMAGE");
  const [campaignName, setCampaignName] = useState("MetaBuddy Website Ad");
  const [objective, setObjective] = useState("TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState(1000);
  const [country, setCountry] = useState("IN");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [pageId, setPageId] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [cta, setCta] = useState("LEARN_MORE");
  const [imageUrl, setImageUrl] = useState("");
  const [imageHash, setImageHash] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [cards, setCards] = useState<CarouselCard[]>([emptyCard(0), emptyCard(1)]);
  const [previewFormat, setPreviewFormat] = useState(PREVIEW_FORMATS[0]);
  const [created, setCreated] = useState<{ adId?: string; creativeId?: string; campaignId?: string } | null>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.getMe().catch(() => {
      window.location.href = "/";
    });
  }, []);

  const canCreate = useMemo(() => {
    if (!campaignName.trim() || !pageId.trim() || !websiteUrl.trim() || !primaryText.trim() || !headline.trim()) return false;
    if (adType === "IMAGE") return Boolean(imageUrl.trim() || imageHash.trim());
    if (adType === "VIDEO") return Boolean(videoUrl.trim() || videoId.trim());
    return cards.length >= 2 && cards.every((card) => (card.imageUrl.trim() || card.imageHash.trim()) && (card.link.trim() || websiteUrl.trim()) && card.name.trim());
  }, [adType, campaignName, cards, headline, imageHash, imageUrl, pageId, primaryText, videoId, videoUrl, websiteUrl]);

  function updateCard(index: number, patch: Partial<CarouselCard>) {
    setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card));
  }

  async function createPausedAd() {
    if (!canCreate) return;
    setBusy("create");
    setError("");
    setPreviewHtml("");
    try {
      const result = await api.createFullMetaAdsV2Campaign({
        adType,
        campaignName,
        objective,
        dailyBudget,
        country,
        ageMin,
        ageMax,
        pageId,
        websiteUrl,
        primaryText,
        headline,
        description,
        callToActionType: cta,
        imageUrl: adType === "IMAGE" ? imageUrl : undefined,
        imageHash: adType === "IMAGE" ? imageHash : undefined,
        videoUrl: adType === "VIDEO" ? videoUrl : undefined,
        videoId: adType === "VIDEO" ? videoId : undefined,
        carouselCards: adType === "CAROUSEL" ? cards : undefined,
      });
      setCreated(result);
      if (result.adId) {
        const preview = await api.getMetaAdsV2AdPreviews(result.adId, previewFormat);
        setPreviewHtml(previewBody(preview));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create paused ad");
    } finally {
      setBusy("");
    }
  }

  async function refreshPreview() {
    if (!created?.adId) return;
    setBusy("preview");
    setError("");
    try {
      const preview = await api.getMetaAdsV2AdPreviews(created.adId, previewFormat);
      setPreviewHtml(previewBody(preview));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Meta preview");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Meta ad creator</p>
              <h1 className="text-[34px] font-bold tracking-tight">Create image, video, and carousel ads</h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                Build a paused Meta ad from your website, then check the Meta preview before you activate it.
              </p>
            </div>
            <button onClick={createPausedAd} disabled={!canCreate || Boolean(busy)} className="btn-primary h-12">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Create paused ad
            </button>
          </div>

          {error && <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-5">
              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-400">Ad type</p>
                <div className="grid grid-cols-3 gap-3">
                  {AD_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setAdType(item.value)}
                      className={`flex h-12 items-center justify-center gap-2 rounded-lg border text-sm font-black ${
                        adType === item.value ? "border-orange-200 bg-orange-50 text-orange-800" : "border-zinc-200 bg-white text-zinc-600"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">Campaign</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <select value={objective} onChange={(e) => setObjective(e.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-300">
                    <option value="AWARENESS">Awareness</option>
                    <option value="TRAFFIC">Traffic</option>
                    <option value="LEADS">Leads</option>
                    <option value="SALES">Sales</option>
                  </select>
                  <input type="number" min={1} value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value || 0))} placeholder="Daily budget" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} placeholder="IN" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold uppercase outline-none focus:border-orange-300" />
                  <input type="number" min={13} max={65} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value || 18))} placeholder="Min age" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <input type="number" min={13} max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value || 65))} placeholder="Max age" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">Creative</p>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Meta Page ID" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  </div>
                  <textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="Primary text" className="min-h-24 w-full resize-none rounded-lg border border-zinc-200 p-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    <select value={cta} onChange={(e) => setCta(e.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-300">
                      <option value="LEARN_MORE">Learn More</option>
                      <option value="SIGN_UP">Sign Up</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="CONTACT_US">Contact Us</option>
                      <option value="BOOK_NOW">Book Now</option>
                    </select>
                  </div>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <p className="mb-4 text-xs font-black uppercase tracking-widest text-zinc-400">Media</p>
                {adType === "IMAGE" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Public image URL" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    <input value={imageHash} onChange={(e) => setImageHash(e.target.value)} placeholder="Or existing image hash" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  </div>
                )}

                {adType === "VIDEO" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Public video URL" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    <input value={videoId} onChange={(e) => setVideoId(e.target.value)} placeholder="Or existing Meta video ID" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  </div>
                )}

                {adType === "CAROUSEL" && (
                  <div className="space-y-3">
                    {cards.map((card, index) => (
                      <div key={index} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-black">Card {index + 1}</p>
                          {cards.length > 2 && (
                            <button type="button" onClick={() => setCards((current) => current.filter((_, cardIndex) => cardIndex !== index))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white">
                              <Trash2 className="h-4 w-4 text-zinc-500" />
                            </button>
                          )}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <input value={card.name} onChange={(e) => updateCard(index, { name: e.target.value })} placeholder="Card headline" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                          <input value={card.link} onChange={(e) => updateCard(index, { link: e.target.value })} placeholder="Card link" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                          <input value={card.imageUrl} onChange={(e) => updateCard(index, { imageUrl: e.target.value })} placeholder="Image URL" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                          <input value={card.imageHash} onChange={(e) => updateCard(index, { imageHash: e.target.value })} placeholder="Or image hash" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                        </div>
                      </div>
                    ))}
                    <button type="button" disabled={cards.length >= 10} onClick={() => setCards((current) => [...current, emptyCard(current.length)])} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 disabled:opacity-50">
                      <Plus className="h-4 w-4" />
                      Add card
                    </button>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Meta preview</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-500">{created?.adId ? `Ad ${created.adId}` : "Create a paused ad to load preview"}</p>
                  </div>
                  <div className="flex gap-2">
                    <select value={previewFormat} onChange={(e) => setPreviewFormat(e.target.value)} className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black outline-none">
                      {PREVIEW_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
                    </select>
                    <button onClick={refreshPreview} disabled={!created?.adId || Boolean(busy)} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 disabled:opacity-50">
                      {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Preview
                    </button>
                  </div>
                </div>

                <div className="min-h-[620px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  {previewHtml ? (
                    <iframe title="Meta ad preview" srcDoc={previewHtml} className="h-[620px] w-full bg-white" />
                  ) : (
                    <div className="flex h-[620px] items-center justify-center p-8 text-center">
                      <div>
                        <Eye className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                        <p className="text-sm font-black text-zinc-700">Preview appears here after Meta creates the paused ad.</p>
                        <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">Video previews may take longer because Meta processes uploaded videos before rendering all placements.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
