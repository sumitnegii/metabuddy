"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Activity, Check, Gauge, MousePointer2, Rocket, Sparkles, Users } from "lucide-react";
import { FadeInUp } from "../ui/Utilities";
import { AdInput } from "../ui/AdInput";
import {
  CampaignConstellation,
  CosmicCampaignHorizon,
  EnergyRings,
  MarketingFlowBackground,
  SignalShaderBackground,
} from "./LandingEffects";

const HeroAgentScene = dynamic(() => import("./HeroAgentScene").then((mod) => mod.HeroAgentScene), {
  ssr: false,
  loading: () => <div className="agent-scene-fallback" />,
});

interface HeroProps {
  onGenerate: (text: string) => void;
  isLoggedIn?: boolean;
  userName?: string;
}

export function Hero({ onGenerate, isLoggedIn = false, userName }: HeroProps) {
  return (
    <motion.section className="landing-hero pt-44 pb-20 px-4 relative z-10 overflow-hidden text-center">
      <SignalShaderBackground className="opacity-75" />
      <MarketingFlowBackground density="hero" className="opacity-85" />
      <CampaignConstellation />
      <EnergyRings />
      <CosmicCampaignHorizon />

      <div className="relative z-10 max-w-4xl mx-auto">
        <FadeInUp>
          <span className="section-label accent-text mb-6">
            {isLoggedIn ? `✦ Welcome back${userName ? `, ${userName.split(" ")[0]}` : ""}` : "✦ The Future of Meta Ads"}
          </span>
        </FadeInUp>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="heading text-6xl sm:text-8xl mb-8 leading-[0.9] tracking-tight">
          Start selling from <br />
          <span className="serif-italic font-medium text-slate-700">a single idea.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          className="text-lg sm:text-xl muted-text mb-12 max-w-2xl mx-auto leading-relaxed">
          {isLoggedIn
            ? "Jump straight into your campaign builder. Your agents, Meta account, and approval workflow are ready in the workspace."
            : "MetaBuddy builds your campaigns, runs your ads and finds you customers."}
          <br className="hidden sm:block" /> {isLoggedIn ? "Create the next campaign from one brief." : "All in minutes."}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}
          className="max-w-xl mx-auto mb-8">
          <AdInput onGenerate={onGenerate} size="lg" ctaLabel={isLoggedIn ? "Create campaign" : "Start for free"} />
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="text-sm text-slate-500">
          {isLoggedIn ? (
            <>
              <span className="font-semibold text-slate-700">Signed in</span> · Opens the real campaign builder
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-700">Free to start</span> · 30-second setup
            </>
          )}
        </motion.p>
      </div>

      <div className="hero-stage relative z-10 mx-auto mt-16 hidden h-[720px] max-w-7xl overflow-hidden sm:block">
        <div className="hero-glow hero-glow-left" />
        <div className="hero-glow hero-glow-right" />
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />

        {[
          { label: "CTR lift", value: "+28%", x: -425, y: 76, icon: <MousePointer2 size={16} />, tone: "text-emerald-700" },
          { label: "Leads tracked", value: "1,248", x: 345, y: 88, icon: <Users size={16} />, tone: "text-blue-700" },
          { label: "Agent score", value: "94", x: -370, y: 525, icon: <Gauge size={16} />, tone: "text-orange-700" },
          { label: "Spend guard", value: "ON", x: 360, y: 520, icon: <Activity size={16} />, tone: "text-emerald-700" },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.9, x: item.x, y: item.y }}
            animate={{ opacity: 1, scale: 1, x: item.x, y: [item.y, item.y - 12, item.y] }}
            transition={{ delay: 0.7 + index * 0.08, duration: 4 + index * 0.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
            className="hero-kpi absolute left-1/2 top-0 z-20 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 ${item.tone}`}>{item.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="text-lg font-black text-slate-900">{item.value}</p>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.94 }}
          animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
          transition={{ delay: 0.5, duration: 5.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", opacity: { duration: 0.8 } }}
          className="agent-workbench absolute left-1/2 top-20 z-30 h-[520px] w-[860px] -translate-x-1/2"
        >
          <HeroAgentScene />

          {[
            { label: "Creative queue", value: "10 variants", x: -420, y: 380, icon: <Sparkles size={16} /> },
            { label: "Winner found", value: "Ad B", x: 325, y: 365, icon: <Check size={16} /> },
            { label: "Budget scaler", value: "+20%", x: -70, y: 430, icon: <Rocket size={16} /> },
          ].map((panel, index) => (
            <motion.div
              key={panel.label}
              initial={{ opacity: 0, x: panel.x, y: panel.y }}
              animate={{ opacity: 1, x: panel.x, y: [panel.y, panel.y - 8, panel.y] }}
              transition={{ delay: 1 + index * 0.12, duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
              className="agent-floating-panel absolute left-1/2 top-0 z-40 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/86 px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600">{panel.icon}</div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{panel.label}</p>
                <p className="text-base font-black text-slate-900">{panel.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: [0, -8, 0] }}
          transition={{ delay: 1.1, duration: 4.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
          className="absolute left-1/2 top-[610px] z-40 w-[520px] -translate-x-1/2 rounded-3xl border border-white/70 bg-white/82 p-4 text-left shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Sparkles size={18} /></div>
              <div>
                <p className="text-sm font-black text-slate-900">Agent cockpit</p>
                <p className="text-xs font-semibold text-slate-500">Optimizing campaign in review mode</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Ready</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["Creative variant built", "Audience risk checked", "Paused launch queued"].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[11px] font-bold leading-4 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
