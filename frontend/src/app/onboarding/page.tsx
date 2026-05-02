"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Shield, Zap } from "lucide-react";

import { api } from "@/lib/api";
import { normalizeUser, type SessionUser } from "@/lib/session";

const INDUSTRIES = [
  "E-commerce", "SaaS", "Real Estate", "Health & Wellness",
  "Food & Drink", "Tech", "Fashion", "Education",
  "Travel", "Finance", "Beauty", "Fitness",
  "Gaming", "Automotive", "Home/Design", "Other",
];

const GOALS = [
  "Lead Generation", "Brand Awareness", "Sales & Conversions",
  "App Installs", "Website Traffic", "Engagement",
  "Video Views", "Store Visits",
];

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada",
  "Australia", "Germany", "France", "UAE",
  "Singapore", "Brazil", "Mexico", "Other",
];

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center"><Loader2 className="w-8 h-8 text-zinc-400 animate-spin" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaAccountName, setMetaAccountName] = useState("");
  const [metaError, setMetaError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mb_token") : null;
    if (!token) {
      router.push("/");
      return;
    }

    api.getMe()
      .then(async (data) => {
        const nextUser = normalizeUser(data);
        if (nextUser?.onboardingCompleted) {
          router.push("/dashboard");
          return;
        }

        setUser(nextUser);
        setCompany(nextUser?.company || "");
        setCountry(nextUser?.country || "");
        setSelectedIndustries(nextUser?.industry || []);
        setSelectedGoals(nextUser?.goals || []);
        setAuthChecked(true);
        try {
          const overview = await api.getMetaAdsV2Overview();
          if (overview?.connected) {
            setMetaConnected(true);
            setMetaAccountName(overview.account?.name || overview.selectedAdAccount?.name || "");
          }
        } catch {
          // Meta connection can be absent during onboarding.
        }
      })
      .catch(() => {
        router.push("/");
      });
  }, [router]);

  useEffect(() => {
    const metaWasConnected = searchParams.get("meta_connected") === "true";
    const nextMetaError = searchParams.get("meta_error");
    window.setTimeout(() => {
      if (metaWasConnected) {
        setStep(4);
        setMetaConnected(true);
        api.getMetaAdsV2Overview()
          .then((overview) => setMetaAccountName(overview.account?.name || overview.selectedAdAccount?.name || ""))
          .catch(() => undefined);
      }
      if (nextMetaError) {
        setStep(4);
        setMetaError(nextMetaError || "Connection failed");
      }
    }, 0);
  }, [searchParams]);

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : prev.length < 3 ? [...prev, ind] : prev
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleConnectMeta = async () => {
    setConnecting(true);
    setMetaError("");
    try {
      const { url } = await api.getMetaAdsV2OAuthUrl();
      window.location.href = url;
    } catch (e: unknown) {
      setMetaError(e instanceof Error ? e.message : "Failed to start connection");
      setConnecting(false);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // We still try to save, but if it fails with a 401 we redirect to login,
      // otherwise we try to push to dashboard anyway if the user is likely authenticated
      await api.completeOnboarding({
        company,
        country,
        industry: selectedIndustries,
        goals: selectedGoals,
      });
      router.push("/dashboard");
    } catch (e: unknown) {
      console.error("Onboarding completion error:", e);
      if (typeof e === "object" && e !== null && "status" in e && e.status === 401) {
        router.push("/");
      } else {
        // If it's a 500 or network error, we try to go to dashboard anyway 
        // as the user might already have the flag set or can try again from there
        router.push("/dashboard");
      }
    } finally {
      setSaving(false);
    }
  };

  const canContinue = () => {
    if (step === 1) return company.trim().length > 0 && country.length > 0;
    if (step === 2) return selectedIndustries.length > 0;
    if (step === 3) return selectedGoals.length > 0;
    return true;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Workspace setup</p>
            <h1 className="text-2xl font-bold tracking-tight text-black">
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Welcome"}
            </h1>
          </div>
          <p className="text-[12px] font-semibold text-zinc-400">Step {step} of 4</p>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-zinc-200">
              <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: i < step ? "100%" : "0%" }} />
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-lg bg-white rounded-2xl border border-zinc-200 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.08)] p-8 animate-in fade-in">
        {step === 1 && (
          <>
            <h2 className="text-[28px] font-bold tracking-tight text-black text-center mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              Let&apos;s Set Your Base
            </h2>
            <p className="text-[14px] text-zinc-500 text-center mb-8">Tell us about your business so your workspace feels personalized from day one.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-[13px] font-bold text-black mb-2">Business / Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. MetaBuddy Inc."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-[14px] font-medium focus:outline-none focus:border-black transition-colors"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-black mb-2">Country</label>
                <div className="grid grid-cols-3 gap-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCountry(c)}
                      className={`px-3 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${
                        country === c ? "bg-black text-white border-black" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-[28px] font-bold tracking-tight text-black text-center mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              What&apos;s Your Industry?
            </h2>
            <p className="text-[14px] text-zinc-500 text-center mb-8">Choose up to 3 categories that best describe your business.</p>

            <div className="relative">
              <span className="absolute top-0 right-0 text-[12px] font-bold text-zinc-400">{selectedIndustries.length}/3</span>
              <div className="grid grid-cols-2 gap-2.5">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => toggleIndustry(ind)}
                    className={`px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all ${
                      selectedIndustries.includes(ind) ? "bg-black text-white border-black" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-[28px] font-bold tracking-tight text-black text-center mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              What Are You Optimizing For?
            </h2>
            <p className="text-[14px] text-zinc-500 text-center mb-8">Pick the campaign objectives that matter most to you right now.</p>

            <div className="grid grid-cols-2 gap-2.5">
              {GOALS.map((goal) => (
                <button
                  key={goal}
                  onClick={() => toggleGoal(goal)}
                  className={`px-4 py-3.5 rounded-xl border text-[13px] font-semibold transition-all ${
                    selectedGoals.includes(goal) ? "bg-black text-white border-black" : "border-zinc-200 text-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-[28px] font-bold tracking-tight text-black text-center mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}>
              Connect Your Meta Ads Account
            </h2>
            <p className="text-[14px] text-zinc-500 text-center mb-8">
              This is what makes the product real: campaigns, ad sets, ads, insights, and agent actions come from this connection.
            </p>

            {metaConnected ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4 animate-in zoom-in">
                  <Check className="w-8 h-8 text-emerald-600" strokeWidth={3} />
                </div>
                <h3 className="text-lg font-bold text-black mb-1">{metaAccountName || "Meta Account"} Connected</h3>
                <p className="text-[13px] text-zinc-500">Your workspace can now sync live campaigns and publish paused ads.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleConnectMeta}
                  disabled={connecting}
                  className="w-full py-4 rounded-2xl bg-[#1877F2] text-white text-[15px] font-bold flex items-center justify-center gap-3 hover:bg-[#166FE5] transition-all disabled:opacity-60 shadow-lg shadow-blue-200/50 active:scale-[0.98]"
                >
                  {connecting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  )}
                  {connecting ? "Connecting..." : "Connect Facebook & Instagram Ads"}
                </button>

                <div className="flex items-center justify-center gap-6 pt-3">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Secure OAuth</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Auto-sync campaigns</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <p className="text-[12px] font-bold text-zinc-500 mb-2">What happens when you connect:</p>
                  <ul className="space-y-1.5 text-[12px] text-zinc-500">
                    <li className="flex items-start gap-2"><span className="text-black font-bold">1.</span> Facebook login opens and permissions are approved</li>
                    <li className="flex items-start gap-2"><span className="text-black font-bold">2.</span> We auto-detect your Meta ad accounts</li>
                    <li className="flex items-start gap-2"><span className="text-black font-bold">3.</span> Dashboard imports campaigns, ad sets, ads, and insights</li>
                    <li className="flex items-start gap-2"><span className="text-black font-bold">4.</span> Agents can create paused ads only after you approve or click create</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-[12px] font-semibold text-zinc-600">
                    You can skip, but real sync, real ad posting, and automated Meta agents require this connection.
                  </p>
                </div>

                {metaError && (
                  <div className="flex items-center gap-2 text-red-500 text-[13px] font-semibold bg-red-50 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {metaError}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-full max-w-lg mt-8 flex items-center justify-between">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-2 text-[14px] font-bold text-zinc-500 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            onClick={() => canContinue() && setStep((s) => s + 1)}
            disabled={!canContinue()}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-black text-white text-[14px] font-bold hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4" /> Continue
          </button>
        ) : (
          <div className="flex items-center gap-3">
            {!metaConnected && (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="px-5 py-3 rounded-xl border border-zinc-200 text-zinc-700 text-[14px] font-bold hover:bg-zinc-50 transition-colors"
              >
                Skip for now
              </button>
            )}
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 rounded-xl bg-[#FFCC00] text-black text-[14px] font-bold hover:bg-[#F2C200] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {metaConnected ? "Take me to the Dashboard!" : "Enter Workspace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
