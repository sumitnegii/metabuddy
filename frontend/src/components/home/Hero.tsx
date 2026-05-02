"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, Brain, Check, Gauge, Heart, LineChart, MousePointer2, Rocket, Sparkles, Users, Zap } from "lucide-react";
import { FadeInUp } from "../ui/Utilities";
import { AdInput } from "../ui/AdInput";
import { FacebookPreview } from "../ads/AdPreviews";

interface HeroProps {
  onGenerate: (text: string) => void;
  isLoggedIn?: boolean;
  userName?: string;
}

export function Hero({ onGenerate, isLoggedIn = false, userName }: HeroProps) {
  return (
    <motion.section className="pt-44 pb-20 px-4 relative z-10 text-center">
      <div className="max-w-4xl mx-auto">
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

      <div className="hero-stage relative mx-auto mt-16 hidden h-[720px] max-w-7xl overflow-hidden sm:block">
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

        {[
          { x: -530, y: 210, rot: -18, z: 1, delay: 0.4, bg: "linear-gradient(160deg,#fff7c8,#ffe996)", label: "Course Launch", sub: "1.2M impressions", price: "3.2x ROAS", btnBg: "#fbbf24", btnText: "Scale campaign", icon: <Sparkles size={16} className="text-amber-700" /> },
          { x: -365, y: 150, rot: -11, z: 2, delay: 0.5, bg: "linear-gradient(160deg,#eee9ff,#ddd6fe)", label: "Retargeting Ads", sub: "850 clicks · Live", price: "$0.42 CPC", btnBg: "#a78bfa", btnText: "View insights", icon: <Heart size={16} className="text-violet-700" /> },
          { x: -190, y: 118, rot: -4, z: 3, delay: 0.6, bg: "linear-gradient(160deg,#dffdea,#baf7ce)", label: "Winner Ad B", sub: "High engagement", price: "$12.4k sales", btnBg: "#22c55e", btnText: "Boost ad", icon: <Check size={16} className="text-emerald-700" /> },
          { x: 190, y: 118, rot: 4, z: 3, delay: 0.6, bg: "linear-gradient(160deg,#ffe4d9,#ffd0bf)", label: "A/B Test Run", sub: "Variation A vs B", price: "B winning", btnBg: "#ff6b47", btnText: "Kill loser", icon: <Zap size={16} className="text-orange-700" /> },
          { x: 365, y: 150, rot: 11, z: 2, delay: 0.5, bg: "linear-gradient(160deg,#fce7f3,#fbcfe8)", label: "Creative Gen", sub: "10 new versions", price: "Auto-refresh", btnBg: "#ec4849", btnText: "Refresh ads", icon: <Rocket size={16} className="text-pink-700" /> },
          { x: 530, y: 210, rot: 18, z: 1, delay: 0.4, bg: "linear-gradient(160deg,#dbeafe,#bfdbfe)", label: "Budget Scaler", sub: "20% daily increase", price: "Optimized", btnBg: "#3b82f6", btnText: "Scaling live", icon: <Brain size={16} className="text-blue-700" /> },
        ].map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 90, rotate: 0, x: c.x }}
            animate={{ opacity: 1, y: [c.y, c.y - 16, c.y], rotate: c.rot, x: c.x }}
            transition={{ delay: c.delay, duration: 5.2 + i * 0.12, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", opacity: { delay: c.delay, duration: 0.8 } }}
            className="hero-ad-card float-tile absolute left-1/2 top-0 w-56 overflow-hidden"
            style={{ zIndex: c.z, transformOrigin: "center bottom" }}
          >
            <div className="aspect-[9/16]" style={{ background: c.bg }}>
              <div className="flex h-full flex-col p-3 text-slate-800">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/75 shadow-sm">{c.icon}</div>
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">MetaBuddy</span>
                </div>
                <div className="relative mb-3 flex-1 overflow-hidden rounded-2xl bg-white/42">
                  <div className="hero-card-sheen absolute inset-0" />
                </div>
                <p className="px-1 text-[12px] font-black leading-tight">{c.label}</p>
                <p className="mb-2 px-1 text-[10px] font-semibold text-slate-500">{c.sub}</p>
                <div className="mb-2 rounded-xl border border-white/80 bg-white/90 py-2 text-center shadow-sm">
                  <p className="text-[11px] font-black text-slate-900">{c.price}</p>
                </div>
                <div className="rounded-xl py-2.5 text-center shadow-md" style={{ background: c.btnBg }}>
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white">{c.btnText}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.92 }}
          animate={{ opacity: 1, y: [0, -10, 0], scale: 1 }}
          transition={{ delay: 0.75, duration: 5.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", opacity: { duration: 0.9 } }}
          className="absolute left-1/2 top-16 z-30 -translate-x-1/2"
        >
          <div className="hero-phone-shell relative h-[610px] w-[300px] rounded-[54px] bg-slate-950 p-2.5 shadow-[0_55px_120px_rgba(15,23,42,0.24),0_20px_50px_rgba(15,23,42,0.16)]">
            <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-950" />
            <div className="relative h-full w-full overflow-hidden rounded-[48px] bg-white">
              <FacebookPreview variant="B" imageUrl="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/70 bg-white/86 p-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Live agent report</span>
                  <LineChart className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Hook", "Audience", "Budget"].map((item, index) => (
                    <div key={item} className="rounded-xl bg-slate-50 p-2">
                      <p className="text-[9px] font-bold text-slate-400">{item}</p>
                      <p className="text-sm font-black text-slate-900">{[92, 88, 96][index]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
