"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, DollarSign, Rocket, Sparkles } from "lucide-react";
import clsx from "clsx";

import { FloatingFeed } from "../components/ads/FloatingFeed";
import { Footer } from "../components/layout/Footer";
import { Hero } from "../components/home/Hero";
import { LogoMarquee } from "../components/home/LogoMarquee";
import { SocialAgentsShowcase } from "../components/home/SocialAgentsShowcase";
import { Testimonials } from "../components/home/Testimonials";
import { CTABanner } from "../components/home/CTABanner";
import { Navbar } from "../components/layout/Navbar";
import { AdModal } from "../components/modals/AdModal";
import { AuthModal } from "../components/modals/AuthModal";
import { FadeInUp, Counter } from "../components/ui/Utilities";
import { useAgentLoop } from "../hooks/useAgentLoop";
import { FEATURES, AGENT_BADGE } from "../lib/constants";
import { api } from "../lib/api";
import { clearSession, normalizeUser, type SessionUser } from "../lib/session";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [userInput, setUserInput] = useState("");
  const [user, setUser] = useState<SessionUser | null>(null);
  const visibleAgents = useAgentLoop(6, 4500);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await api.getMe();
        setUser(normalizeUser(userData));
      } catch {
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const openAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleGenerate = (text: string) => {
    setUserInput(text || "New premium product launch");
    if (!user) {
      openAuth("register");
      return;
    }
    setModalOpen(true);
  };

  const handleAuthSuccess = (sessionUser: SessionUser) => {
    setUser(sessionUser);
    setModalOpen(true);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setModalOpen(false);
    setAuthOpen(false);
  };

  return (
    <div className="relative min-h-screen">
      <div className="warm-bg" />
      <div className="paper" />

      <Navbar
        onStartFree={() => handleGenerate("")}
        onLogin={() => openAuth("login")}
        onSignup={() => openAuth("register")}
        onLogout={handleLogout}
        isLoggedIn={Boolean(user)}
      />

      <Hero onGenerate={handleGenerate} />

      {/* ── Logo Trust Bar ── */}
      <LogoMarquee />

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4 relative z-10 bg-white">
        <FadeInUp className="text-center mb-3">
          <span className="section-label accent-text">✦ How it works</span>
        </FadeInUp>
        <FadeInUp delay={0.05} className="text-center mb-16">
          <h2 className="heading text-4xl sm:text-5xl">
            MetaBuddy <span className="serif-italic font-medium text-slate-700">is simple.</span>
          </h2>
        </FadeInUp>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3">
          {[
            { num: "01", icon: <Sparkles size={22} className="text-orange-500" />, title: "Type your idea", desc: "Describe your product or service. No marketing expertise needed." },
            { num: "02", icon: <Brain size={22} className="text-violet-500" />, title: "AI builds your ads", desc: "Copy, creatives, and audience targeting are created instantly." },
            { num: "03", icon: <Rocket size={22} className="text-rose-500" />, title: "Launch in one click", desc: "Push campaigns from concept to workspace in a guided flow." },
            { num: "04", icon: <DollarSign size={22} className="text-emerald-500" />, title: "Get customers", desc: "Track performance, review content, and scale winning campaigns." },
          ].map((step, i) => (
            <FadeInUp key={step.num} delay={i * 0.08}>
              <div className="soft-card p-6 h-full relative group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/0 to-emerald-500/0 group-hover:from-orange-500/[0.03] group-hover:to-emerald-500/[0.03] transition-all duration-700" />
                <p className="text-xs font-bold text-slate-400 mb-4">{step.num}</p>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(255,107,71,0.08)" }}>
                  {step.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-28 px-4 relative z-10">
        <FadeInUp className="text-center mb-16">
          <span className="section-label accent-text">✦ Magic Features</span>
          <h2 className="heading text-4xl sm:text-5xl mt-4">
            Run ads <span className="serif-italic font-medium text-slate-700">without the headache.</span>
          </h2>
        </FadeInUp>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <FadeInUp key={f.title} delay={i * 0.07}>
              <div className="soft-card p-7 h-full group relative overflow-hidden">
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,79,0.06),transparent_70%)]" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" style={{ background: "linear-gradient(135deg,#ffe4d9,#fef3c7)", color: "#e5532f" }}>
                      {f.icon}
                    </div>
                    <span className="text-[11px] font-semibold accent-text">{f.label}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 text-lg leading-tight">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </section>

      <SocialAgentsShowcase />

      {/* ── AI Agents Terminal ── */}
      <section className="py-28 px-4 relative z-10 bg-[#fafafa]">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="section-label accent-text mb-3">✦ Magic Agents</span>
          <h2 className="heading text-4xl sm:text-5xl">
            AI working <span className="serif-italic font-medium text-slate-700">24/7 for you.</span>
          </h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <div className="soft-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "rgba(15,23,42,0.06)", background: "#fafaf6" }}>
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[11px] text-slate-500 font-mono">metabuddy-agent · live</span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 font-semibold">active</span>
              </div>
            </div>
            <div className="px-5 py-4 min-h-[280px] space-y-2">
              <AnimatePresence initial={false}>
                {visibleAgents.map((msg, i) => {
                  const badge = AGENT_BADGE[msg.type];
                  return (
                    <motion.div
                      key={`${msg.text}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <span className={clsx("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", badge.class)}>
                        {badge.label}
                      </span>
                      <p className="text-[13px] text-slate-700 font-medium">{msg.text}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <FloatingFeed />

      {/* ── Big Stats ── */}
      <section className="py-32 px-4 relative z-10 bg-[#fafafa] overflow-hidden">
        <FadeInUp className="text-center mb-16">
          <span className="section-label accent-text">✦ Proven Results</span>
          <h2 className="heading text-4xl sm:text-5xl mt-4">
            Numbers that <span className="serif-italic font-medium text-slate-700">matter.</span>
          </h2>
        </FadeInUp>
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { value: 3.2, suffix: "x", label: "Average ROAS", sub: "across all campaigns" },
            { value: 40, suffix: "%", label: "Lower CPC", sub: "vs manual campaign management" },
            { value: 2, suffix: " min", label: "Time to workspace", sub: "from idea to live campaign" },
          ].map((stat, i) => (
            <FadeInUp key={stat.label} delay={i * 0.1}>
              <div className="soft-card p-10 text-center group hover:bg-white transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_100%,rgba(249,115,79,0.06),transparent_70%)]" />
                <div className="relative">
                  <div className="text-5xl font-bold text-slate-900 mb-3 tracking-tight">
                    <Counter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.15em]">{stat.label}</p>
                  <p className="text-xs text-slate-400 mt-2">{stat.sub}</p>
                </div>
              </div>
            </FadeInUp>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <Testimonials />

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 relative z-10 bg-[#fafafa]">
        <div className="max-w-6xl mx-auto">
          <FadeInUp className="text-center mb-4">
            <span className="section-label accent-text">✦ Pricing</span>
          </FadeInUp>
          <FadeInUp delay={0.05} className="text-center mb-14">
            <h2 className="heading text-4xl sm:text-5xl">
              Start lean, scale <span className="serif-italic font-medium text-slate-700">when the funnel works.</span>
            </h2>
          </FadeInUp>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                name: "Starter",
                price: "Free",
                detail: "Validate your first idea and generate one campaign.",
                points: ["1 campaign workspace", "AI strategy brief", "Creative previews"],
                cta: "Start free",
              },
              {
                name: "Growth",
                price: "$49/mo",
                detail: "For founders running active acquisition on Meta.",
                points: ["Unlimited campaign drafts", "Content approval inbox", "Agent team + dashboard"],
                cta: "Upgrade to Growth",
                featured: true,
              },
              {
                name: "Scale",
                price: "$199/mo",
                detail: "For teams managing multiple offers and ad accounts.",
                points: ["Multi-brand workflows", "Advanced reporting", "Priority automation support"],
                cta: "Talk to sales",
              },
            ].map((plan, i) => (
              <FadeInUp key={plan.name} delay={i * 0.08}>
                <div className={clsx(
                  "soft-card p-8 h-full relative overflow-hidden group",
                  plan.featured && "bg-slate-900 text-white border-slate-900"
                )}>
                  {plan.featured && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,79,0.12),transparent_60%)]" />
                  )}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={clsx("text-2xl font-bold", plan.featured ? "text-white" : "text-slate-900")}>{plan.name}</h3>
                      {plan.featured ? <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-300">Most popular</span> : null}
                    </div>
                    <p className={clsx("text-4xl font-black tracking-tight mb-3", plan.featured ? "text-white" : "text-slate-900")}>{plan.price}</p>
                    <p className={clsx("text-sm leading-relaxed mb-8", plan.featured ? "text-slate-300" : "text-slate-500")}>{plan.detail}</p>
                    <div className="space-y-3 mb-8">
                      {plan.points.map((point) => (
                        <div key={point} className="flex items-center gap-3">
                          <div className={clsx("w-2 h-2 rounded-full", plan.featured ? "bg-orange-300" : "bg-orange-500")} />
                          <p className={clsx("text-sm font-medium", plan.featured ? "text-slate-200" : "text-slate-700")}>{point}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => handleGenerate("")}
                      className={clsx(
                        "w-full rounded-full px-6 py-3 text-sm font-bold transition-all hover:-translate-y-0.5",
                        plan.featured ? "bg-white text-slate-900 hover:bg-slate-100 shadow-lg" : "bg-slate-900 text-white hover:bg-slate-700"
                      )}
                    >
                      {plan.cta}
                    </button>
                  </div>
                </div>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <CTABanner onAction={() => handleGenerate("")} />

      <Footer />

      <AdModal open={modalOpen} onClose={() => setModalOpen(false)} userInput={userInput} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onSuccess={handleAuthSuccess} initialMode={authMode} />
    </div>
  );
}
