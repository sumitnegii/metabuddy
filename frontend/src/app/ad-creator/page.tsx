"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Camera,
  ChevronRight,
  Eye,
  Globe2,
  ImageIcon,
  Loader2,
  MapPin,
  MoreHorizontal,
  PanelsTopLeft,
  Plus,
  Rocket,
  Target,
  Trash2,
  Users,
  Video,
} from "lucide-react";

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

type MetaCampaign = {
  metaCampaignId: string;
  name: string;
  objective?: string;
  dailyBudget?: number;
};

type MetaAdSet = {
  metaAdSetId: string;
  name?: string;
  dailyBudget?: number;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: { countries?: string[] };
    flexible_spec?: Array<{ interests?: Array<{ name?: string }> }>;
  };
};

type MetaAd = {
  metaAdId: string;
  metaAdSetId?: string;
  name?: string;
  headline?: string;
  body?: string;
  callToActionType?: string;
  imageUrl?: string;
  raw?: {
    creative?: {
      object_story_spec?: {
        link_data?: {
          link?: string;
          message?: string;
          name?: string;
          description?: string;
          picture?: string;
          call_to_action?: { type?: string; value?: { link?: string } };
        };
        video_data?: {
          message?: string;
          title?: string;
          image_url?: string;
          call_to_action?: { type?: string; value?: { link?: string } };
        };
      };
      thumbnail_url?: string;
    };
  };
};

type CampaignDetail = {
  campaign?: MetaCampaign;
  adSets?: MetaAdSet[];
  ads?: MetaAd[];
};

type MetaOverview = {
  connected: boolean;
  campaigns?: MetaCampaign[];
  selectedAdAccount?: { accountId: string; name?: string; currency?: string };
};

type MetaPage = {
  id: string;
  name: string;
  canAdvertise?: boolean;
};

type MetaDiagnostics = {
  pages?: MetaPage[];
};

const AD_TYPES: Array<{ value: AdType; label: string; icon: typeof ImageIcon }> = [
  { value: "IMAGE", label: "Image", icon: ImageIcon },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "CAROUSEL", label: "Carousel", icon: PanelsTopLeft },
];

const OBJECTIVES = [
  { value: "AWARENESS", label: "Awareness", hint: "Reach people and build recall" },
  { value: "TRAFFIC", label: "Traffic", hint: "Bring people to your site" },
  { value: "LEADS", label: "Leads", hint: "Collect contact info" },
  { value: "SALES", label: "Sales", hint: "Drive purchases or conversions" },
];

const PREVIEW_FORMATS = [
  "DESKTOP_FEED_STANDARD",
  "MOBILE_FEED_STANDARD",
  "INSTAGRAM_STANDARD",
  "INSTAGRAM_STORY",
];

const PLACEMENTS = [
  { id: "facebook", label: "Facebook", icon: Globe2 },
  { id: "instagram", label: "Instagram", icon: Camera },
  { id: "audience_network", label: "Audience Network", icon: Globe2 },
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

function formatObjective(value: string) {
  return OBJECTIVES.find((objective) => objective.value === value)?.label || value;
}

function objectiveFromMeta(value?: string) {
  const normalized = String(value || "").replace(/^OUTCOME_/, "");
  return OBJECTIVES.some((objective) => objective.value === normalized) ? normalized : "TRAFFIC";
}

function formatCta(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function creativeLink(ad?: MetaAd) {
  const story = ad?.raw?.creative?.object_story_spec;
  return story?.link_data?.link || story?.link_data?.call_to_action?.value?.link || story?.video_data?.call_to_action?.value?.link || "";
}

function creativeImage(ad?: MetaAd) {
  const story = ad?.raw?.creative?.object_story_spec;
  return ad?.imageUrl || story?.link_data?.picture || story?.video_data?.image_url || ad?.raw?.creative?.thumbnail_url || "";
}

function creativeBody(ad?: MetaAd) {
  const story = ad?.raw?.creative?.object_story_spec;
  return ad?.body || story?.link_data?.message || story?.video_data?.message || "";
}

function creativeHeadline(ad?: MetaAd) {
  const story = ad?.raw?.creative?.object_story_spec;
  return ad?.headline || story?.link_data?.name || story?.video_data?.title || ad?.name || "";
}

export default function AdCreatorPage() {
  const [adType, setAdType] = useState<AdType>("IMAGE");
  const [campaignName, setCampaignName] = useState("");
  const [objective, setObjective] = useState("TRAFFIC");
  const [dailyBudget, setDailyBudget] = useState(0);
  const [country, setCountry] = useState("");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [gender, setGender] = useState("All");
  const [interests, setInterests] = useState("");
  const [schedule, setSchedule] = useState("");
  const [selectedPlacements, setSelectedPlacements] = useState(["facebook", "instagram"]);
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
  const [sourceLoading, setSourceLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState("");
  const [pageOptions, setPageOptions] = useState<MetaPage[]>([]);
  const [selectedAdAccountName, setSelectedAdAccountName] = useState("");
  const [sourceCampaigns, setSourceCampaigns] = useState<MetaCampaign[]>([]);
  const [selectedSourceCampaignId, setSelectedSourceCampaignId] = useState("");
  const [sourceAdSets, setSourceAdSets] = useState<MetaAdSet[]>([]);
  const [selectedSourceAdSetId, setSelectedSourceAdSetId] = useState("");
  const [sourceAds, setSourceAds] = useState<MetaAd[]>([]);
  const [selectedSourceAdId, setSelectedSourceAdId] = useState("");

  function applyCampaignSource(campaign: MetaCampaign) {
    setSelectedSourceCampaignId(campaign.metaCampaignId);
    setCampaignName(`${campaign.name} Copy`);
    setObjective(objectiveFromMeta(campaign.objective));
  }

  function applyAdSetSource(adSet: MetaAdSet | undefined, campaign?: MetaCampaign) {
    const targeting = adSet?.targeting || {};
    const countries = targeting.geo_locations?.countries || [];
    const interestNames = (targeting.flexible_spec || [])
      .flatMap((spec) => spec.interests || [])
      .map((interest) => interest.name)
      .filter(Boolean);

    setSelectedSourceAdSetId(adSet?.metaAdSetId || "");
    setDailyBudget(adSet?.dailyBudget || campaign?.dailyBudget || 0);
    setCountry(countries[0] || "");
    setAgeMin(targeting.age_min || 18);
    setAgeMax(targeting.age_max || 65);
    setGender(targeting.genders?.includes(1) && !targeting.genders?.includes(2) ? "Men" : targeting.genders?.includes(2) && !targeting.genders?.includes(1) ? "Women" : "All");
    setInterests(interestNames.join(", "));
    setSchedule(adSet ? "Use selected ad set schedule" : "No ad set selected");
  }

  function applyAdSource(ad: MetaAd | undefined) {
    setSelectedSourceAdId(ad?.metaAdId || "");
    setWebsiteUrl(creativeLink(ad));
    setPrimaryText(creativeBody(ad));
    setHeadline(creativeHeadline(ad));
    setDescription(ad?.raw?.creative?.object_story_spec?.link_data?.description || "");
    setCta(ad?.callToActionType || ad?.raw?.creative?.object_story_spec?.link_data?.call_to_action?.type || ad?.raw?.creative?.object_story_spec?.video_data?.call_to_action?.type || "LEARN_MORE");
    setImageUrl(creativeImage(ad));
  }

  function adsForAdSet(ads: MetaAd[], adSetId: string) {
    if (!adSetId) return ads;
    return ads.filter((ad) => !ad.metaAdSetId || ad.metaAdSetId === adSetId);
  }

  useEffect(() => {
    let active = true;
    async function loadOriginalData() {
      try {
        await api.getMe();
        const overview: MetaOverview = await api.getMetaAdsV2Overview();
        if (!active) return;
        setSelectedAdAccountName(overview.selectedAdAccount?.name || overview.selectedAdAccount?.accountId || "");

        const diagnostics = await api.getMetaAdsV2Diagnostics().catch(() => null) as MetaDiagnostics | null;
        if (!active) return;
        const pages = diagnostics?.pages || [];
        setPageOptions(pages);
        const firstPage = pages.find((page) => page.canAdvertise) || pages[0];
        if (firstPage) setPageId(firstPage.id);

        const sourceCampaign = overview.campaigns?.[0];
        setSourceCampaigns(overview.campaigns || []);
        if (!sourceCampaign) {
          setSourceLabel(overview.connected ? "No imported campaign data found. Sync Meta first." : "Meta is not connected.");
          return;
        }

        applyCampaignSource(sourceCampaign);
        const detail: CampaignDetail = await api.getMetaAdsV2Campaign(sourceCampaign.metaCampaignId);
        if (!active) return;
        const adSet = detail.adSets?.[0];
        const allAds = detail.ads || [];
        const scopedAds = adsForAdSet(allAds, adSet?.metaAdSetId || "");
        const ad = scopedAds.find((item) => creativeImage(item) || creativeBody(item) || creativeHeadline(item)) || scopedAds[0] || allAds[0];

        setSourceAdSets(detail.adSets || []);
        setSourceAds(allAds);
        applyAdSetSource(adSet, sourceCampaign);
        applyAdSource(ad);
        setSourceLabel(`Loaded Campaign -> Ad Set -> Ad: ${sourceCampaign.name}${adSet?.name ? ` / ${adSet.name}` : ""}${ad?.name ? ` / ${ad.name}` : ""}`);
      } catch {
        if (active) window.location.href = "/";
      } finally {
        if (active) setSourceLoading(false);
      }
    }
    loadOriginalData();
    return () => {
      active = false;
    };
  }, []);

  const previewImage = useMemo(() => {
    if (adType === "CAROUSEL") return cards.find((card) => card.imageUrl.trim())?.imageUrl || imageUrl;
    return imageUrl;
  }, [adType, cards, imageUrl]);

  const destination = useMemo(() => {
    try {
      return new URL(websiteUrl).hostname.replace(/^www\./, "");
    } catch {
      return websiteUrl || "yourwebsite.com";
    }
  }, [websiteUrl]);

  const selectedPage = useMemo(() => pageOptions.find((page) => page.id === pageId), [pageId, pageOptions]);
  const visibleSourceAds = useMemo(() => adsForAdSet(sourceAds, selectedSourceAdSetId), [sourceAds, selectedSourceAdSetId]);
  const previewBrandName = selectedPage?.name || selectedAdAccountName || "Meta Page";
  const previewInitials = previewBrandName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MP";

  const canCreate = useMemo(() => {
    if (!campaignName.trim() || !pageId.trim() || !websiteUrl.trim() || !primaryText.trim() || !headline.trim()) return false;
    if (adType === "IMAGE") return Boolean(imageUrl.trim() || imageHash.trim());
    if (adType === "VIDEO") return Boolean(videoUrl.trim() || videoId.trim());
    return cards.length >= 2 && cards.every((card) => (card.imageUrl.trim() || card.imageHash.trim()) && (card.link.trim() || websiteUrl.trim()) && card.name.trim());
  }, [adType, campaignName, cards, headline, imageHash, imageUrl, pageId, primaryText, videoId, videoUrl, websiteUrl]);

  function updateCard(index: number, patch: Partial<CarouselCard>) {
    setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card));
  }

  function togglePlacement(placementId: string) {
    setSelectedPlacements((current) =>
      current.includes(placementId) ? current.filter((id) => id !== placementId) : [...current, placementId]
    );
  }

  async function selectSourceCampaign(campaignId: string) {
    const campaign = sourceCampaigns.find((item) => item.metaCampaignId === campaignId);
    if (!campaign) return;
    setBusy("source");
    setError("");
    try {
      applyCampaignSource(campaign);
      const detail: CampaignDetail = await api.getMetaAdsV2Campaign(campaign.metaCampaignId);
      const adSet = detail.adSets?.[0];
      const allAds = detail.ads || [];
      const scopedAds = adsForAdSet(allAds, adSet?.metaAdSetId || "");
      const ad = scopedAds.find((item) => creativeImage(item) || creativeBody(item) || creativeHeadline(item)) || scopedAds[0] || allAds[0];
      setSourceAdSets(detail.adSets || []);
      setSourceAds(allAds);
      applyAdSetSource(adSet, campaign);
      applyAdSource(ad);
      setSourceLabel(`Loaded Campaign -> Ad Set -> Ad: ${campaign.name}${adSet?.name ? ` / ${adSet.name}` : ""}${ad?.name ? ` / ${ad.name}` : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load campaign source data");
    } finally {
      setBusy("");
    }
  }

  function selectSourceAdSet(adSetId: string) {
    const campaign = sourceCampaigns.find((item) => item.metaCampaignId === selectedSourceCampaignId);
    const adSet = sourceAdSets.find((item) => item.metaAdSetId === adSetId);
    const scopedAds = adsForAdSet(sourceAds, adSetId);
    const ad = scopedAds.find((item) => creativeImage(item) || creativeBody(item) || creativeHeadline(item)) || scopedAds[0];
    applyAdSetSource(adSet, campaign);
    applyAdSource(ad);
    setSourceLabel(`Loaded Campaign -> Ad Set -> Ad: ${campaign?.name || "Campaign"}${adSet?.name ? ` / ${adSet.name}` : ""}${ad?.name ? ` / ${ad.name}` : ""}`);
  }

  function selectSourceAd(adId: string) {
    const campaign = sourceCampaigns.find((item) => item.metaCampaignId === selectedSourceCampaignId);
    const adSet = sourceAdSets.find((item) => item.metaAdSetId === selectedSourceAdSetId);
    const ad = sourceAds.find((item) => item.metaAdId === adId);
    applyAdSource(ad);
    setSourceLabel(`Loaded Campaign -> Ad Set -> Ad: ${campaign?.name || "Campaign"}${adSet?.name ? ` / ${adSet.name}` : ""}${ad?.name ? ` / ${ad.name}` : ""}`);
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
      <main className="ml-[90px] flex-1 p-5 lg:p-8">
        <div className="mx-auto max-w-[1540px]">
          <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Meta ads manager style builder</p>
              <h1 className="text-[32px] font-black tracking-tight">Campaign, ad set, and ad preview</h1>
              <p className="mt-2 max-w-3xl text-[15px] font-semibold leading-6 text-zinc-500">
                Build the hierarchy the same way Meta Ads Manager thinks about it: goal first, audience and budget second, creative last.
              </p>
            </div>
            <button onClick={createPausedAd} disabled={!canCreate || Boolean(busy)} className="btn-primary h-12 shrink-0">
              {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Create paused ad
            </button>
          </div>

          {error && <div className="mb-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

          <div className="mb-5 rounded-lg border border-zinc-200 bg-white/90 px-4 py-3 text-sm font-semibold text-zinc-600 shadow-sm">
            {sourceLoading ? "Loading original Meta data from the API..." : sourceLabel || "Using fields from your imported Meta API data. Empty fields mean Meta did not return that creative value."}
          </div>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_460px]">
            <section className="grid gap-5 xl:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm">
                <div className="border-b border-zinc-100 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-sm font-black text-blue-700">1</span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Campaign</p>
                        <h2 className="text-lg font-black">Goal</h2>
                      </div>
                    </div>
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-zinc-500">Choose what you want to achieve. Ads are not created at this level.</p>
                </div>
                <div className="space-y-4 p-5">
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Source campaign</span>
                    <select
                      value={selectedSourceCampaignId}
                      onChange={(event) => selectSourceCampaign(event.target.value)}
                      disabled={sourceLoading || busy === "source" || sourceCampaigns.length === 0}
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-300 disabled:opacity-60"
                    >
                      <option value="">{sourceCampaigns.length ? "Select campaign" : "No imported campaigns"}</option>
                      {sourceCampaigns.map((campaign) => (
                        <option key={campaign.metaCampaignId} value={campaign.metaCampaignId}>{campaign.name}</option>
                      ))}
                    </select>
                  </label>
                  <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-blue-300" />
                  <div className="space-y-2">
                    {OBJECTIVES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setObjective(item.value)}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${objective === item.value ? "border-blue-200 bg-blue-50" : "border-zinc-200 bg-white hover:border-zinc-300"}`}
                      >
                        <span className="block text-sm font-black text-zinc-900">{item.label}</span>
                        <span className="mt-1 block text-xs font-semibold text-zinc-500">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm">
                <div className="border-b border-zinc-100 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-sm font-black text-emerald-700">2</span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ad set</p>
                        <h2 className="text-lg font-black">Audience + Budget</h2>
                      </div>
                    </div>
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-zinc-500">Control who sees the ad, where it runs, schedule, and spend.</p>
                </div>
                <div className="space-y-4 p-5">
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Source ad set</span>
                    <select
                      value={selectedSourceAdSetId}
                      onChange={(event) => selectSourceAdSet(event.target.value)}
                      disabled={sourceLoading || sourceAdSets.length === 0}
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-300 disabled:opacity-60"
                    >
                      <option value="">{sourceAdSets.length ? "Select ad set" : "No ad sets under campaign"}</option>
                      {sourceAdSets.map((adSet) => (
                        <option key={adSet.metaAdSetId} value={adSet.metaAdSetId}>{adSet.name || adSet.metaAdSetId}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Daily budget</span>
                      <input type="number" min={1} value={dailyBudget} onChange={(e) => setDailyBudget(Number(e.target.value || 0))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Country</span>
                      <input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold uppercase outline-none focus:border-emerald-300" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Min age</span>
                      <input type="number" min={13} max={65} value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value || 18))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Max age</span>
                      <input type="number" min={13} max={65} value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value || 65))} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300" />
                    </label>
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Gender</span>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-300">
                      <option>All</option>
                      <option>Men</option>
                      <option>Women</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Interests</span>
                    <input value={interests} onChange={(e) => setInterests(e.target.value)} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Schedule</span>
                    <input value={schedule} onChange={(e) => setSchedule(e.target.value)} className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-emerald-300" />
                  </label>
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Placements</span>
                    <div className="grid gap-2">
                      {PLACEMENTS.map((placement) => (
                        <button
                          key={placement.id}
                          type="button"
                          onClick={() => togglePlacement(placement.id)}
                          className={`flex h-10 items-center justify-between rounded-lg border px-3 text-sm font-black ${selectedPlacements.includes(placement.id) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-zinc-200 bg-white text-zinc-600"}`}
                        >
                          <span className="flex items-center gap-2"><placement.icon className="h-4 w-4" />{placement.label}</span>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm">
                <div className="border-b border-zinc-100 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50 text-sm font-black text-orange-700">3</span>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Ad</p>
                        <h2 className="text-lg font-black">Creative</h2>
                      </div>
                    </div>
                    <ImageIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-sm font-semibold leading-6 text-zinc-500">This is the actual photo, caption, headline, and CTA people see.</p>
                </div>
                <div className="space-y-4 p-5">
                  <label className="block space-y-1">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Source ad</span>
                    <select
                      value={selectedSourceAdId}
                      onChange={(event) => selectSourceAd(event.target.value)}
                      disabled={sourceLoading || visibleSourceAds.length === 0}
                      className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-300 disabled:opacity-60"
                    >
                      <option value="">{visibleSourceAds.length ? "Select ad" : "No ads under ad set"}</option>
                      {visibleSourceAds.map((ad) => (
                        <option key={ad.metaAdId} value={ad.metaAdId}>{ad.name || ad.metaAdId}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {AD_TYPES.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAdType(item.value)}
                        className={`flex h-10 items-center justify-center gap-2 rounded-lg border text-xs font-black ${adType === item.value ? "border-orange-200 bg-orange-50 text-orange-800" : "border-zinc-200 bg-white text-zinc-600"}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    {pageOptions.length ? (
                      <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-300">
                        <option value="">Select Meta Page</option>
                        {pageOptions.map((page) => (
                          <option key={page.id} value={page.id}>{page.name} ({page.id})</option>
                        ))}
                      </select>
                    ) : (
                      <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Meta Page ID from API" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    )}
                    <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://yourwebsite.com" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  </div>
                  <textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="Primary text / caption" className="min-h-24 w-full resize-none rounded-lg border border-zinc-200 p-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                    <select value={cta} onChange={(e) => setCta(e.target.value)} className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold outline-none focus:border-orange-300">
                      <option value="LEARN_MORE">Learn More</option>
                      <option value="SIGN_UP">Sign Up</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="CONTACT_US">Contact Us</option>
                      <option value="BOOK_NOW">Book Now</option>
                    </select>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="h-11 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                  </div>

                  {adType === "IMAGE" && (
                    <div className="space-y-3">
                      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Public image URL" className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                      <input value={imageHash} onChange={(e) => setImageHash(e.target.value)} placeholder="Or existing image hash" className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                    </div>
                  )}

                  {adType === "VIDEO" && (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
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
                          <div className="grid gap-3">
                            <input value={card.name} onChange={(e) => updateCard(index, { name: e.target.value })} placeholder="Card headline" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                            <input value={card.link} onChange={(e) => updateCard(index, { link: e.target.value })} placeholder="Card link" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
                            <input value={card.imageUrl} onChange={(e) => updateCard(index, { imageUrl: e.target.value })} placeholder="Image URL" className="h-10 rounded-lg border border-zinc-200 px-3 text-sm font-semibold outline-none focus:border-orange-300" />
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
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-lg border border-zinc-200 bg-white/95 shadow-sm">
                <div className="border-b border-zinc-100 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Full preview</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">Live Facebook feed ad with photo</p>
                    </div>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{formatObjective(objective)}</span>
                  </div>
                </div>
                <div className="bg-[#f0f2f5] p-4">
                  <div className="mx-auto overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                    <div className="flex items-start justify-between p-4">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white">{previewInitials}</div>
                        <div>
                          <p className="text-sm font-black text-zinc-900">{previewBrandName}</p>
                          <p className="flex items-center gap-1 text-xs font-semibold text-zinc-500">Sponsored <Globe2 className="h-3 w-3" /></p>
                        </div>
                      </div>
                      <MoreHorizontal className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="px-4 pb-3">
                      <p className="whitespace-pre-line text-[15px] font-medium leading-6 text-zinc-900">{primaryText || "Primary text appears here."}</p>
                    </div>
                    <div className="aspect-square w-full bg-zinc-100">
                      {adType === "VIDEO" && videoUrl ? (
                        <video src={videoUrl} className="h-full w-full object-cover" controls muted />
                      ) : previewImage ? (
                        <img src={previewImage} alt="Ad creative preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center p-8 text-center">
                          <div>
                            <ImageIcon className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                            <p className="text-sm font-black text-zinc-500">No image returned by the Meta API</p>
                            <p className="mt-1 text-xs font-semibold text-zinc-400">Add an image URL or image hash before creating a new ad.</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-y border-zinc-200 bg-zinc-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-zinc-500">{destination}</p>
                        <p className="truncate text-base font-black leading-tight text-zinc-900">{headline || "Headline appears here"}</p>
                        {description && <p className="mt-1 line-clamp-1 text-xs font-semibold text-zinc-500">{description}</p>}
                      </div>
                      <button type="button" className="h-9 shrink-0 rounded-md bg-zinc-200 px-4 text-xs font-black text-zinc-800">{formatCta(cta)}</button>
                    </div>
                    <div className="grid grid-cols-3 border-b border-zinc-100 px-4 py-2 text-center text-sm font-black text-zinc-500">
                      <span>Like</span>
                      <span>Comment</span>
                      <span>Share</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600">
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-emerald-600" /> {gender}, ages {ageMin}-{ageMax}, {country}</div>
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> {selectedPlacements.length ? selectedPlacements.join(", ").replaceAll("_", " ") : "No placements selected"}</div>
                    <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-600" /> {schedule}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white/90 p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Meta preview iframe</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-500">{created?.adId ? `Ad ${created.adId}` : "Available after Meta creates the paused ad"}</p>
                  </div>
                  <div className="flex gap-2">
                    <select value={previewFormat} onChange={(e) => setPreviewFormat(e.target.value)} className="h-10 max-w-52 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-black outline-none">
                      {PREVIEW_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
                    </select>
                    <button onClick={refreshPreview} disabled={!created?.adId || Boolean(busy)} className="flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-black text-zinc-700 disabled:opacity-50">
                      {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      Preview
                    </button>
                  </div>
                </div>

                <div className="min-h-[520px] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  {previewHtml ? (
                    <iframe title="Meta ad preview" srcDoc={previewHtml} className="h-[520px] w-full bg-white" />
                  ) : (
                    <div className="flex h-[520px] items-center justify-center p-8 text-center">
                      <div>
                        <Eye className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
                        <p className="text-sm font-black text-zinc-700">Create a paused ad to load Meta’s official preview.</p>
                        <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">The live preview above stays visible while you edit, including the photo.</p>
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
