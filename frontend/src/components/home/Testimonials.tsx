"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { FadeInUp } from "../ui/Utilities";

const TESTIMONIALS = [
  {
    quote: "MetaBuddy replaced our entire media buying team. We went from $2k/mo in ad spend with no clue what worked, to 3.4x ROAS in under two weeks.",
    name: "Sarah Chen",
    role: "Founder, GlowLab Skincare",
    metric: "3.4x ROAS",
  },
  {
    quote: "The AI agents are genuinely mind-blowing. They caught a budget leak we'd missed for months and reallocated spend to our best creatives automatically.",
    name: "Marcus Rivera",
    role: "Growth Lead, FitStack",
    metric: "40% lower CPA",
  },
  {
    quote: "We used to spend 6 hours a week managing Meta ads. Now the agents handle everything and I just approve the changes. It's like having a full team.",
    name: "Priya Sharma",
    role: "CEO, LearnNest",
    metric: "6hrs saved/week",
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setActive((p) => (p + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(timer);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section className="py-28 px-4 relative z-10 bg-white overflow-hidden">
      <FadeInUp className="text-center mb-4">
        <span className="section-label accent-text">✦ What founders say</span>
      </FadeInUp>
      <FadeInUp delay={0.05} className="text-center mb-16">
        <h2 className="heading text-4xl sm:text-5xl">
          Results that <span className="serif-italic font-medium text-slate-700">speak for themselves.</span>
        </h2>
      </FadeInUp>

      <div className="max-w-3xl mx-auto">
        <div className="relative soft-card p-10 sm:p-14 text-center min-h-[280px] flex flex-col items-center justify-center">
          <Quote className="absolute top-6 left-8 h-8 w-8 text-orange-200 rotate-180" />

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center"
            >
              <p className="text-lg sm:text-xl font-medium text-slate-700 leading-relaxed mb-8 max-w-2xl">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="inline-flex items-center gap-3 rounded-full bg-slate-50 border border-slate-100 px-5 py-2.5 mb-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-xs font-black">
                  {t.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
              <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-xs font-black text-emerald-700 tracking-wide">
                {t.metric}
              </span>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button onClick={() => setActive((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)} className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === active ? "bg-orange-500 w-6" : "bg-slate-300"}`} />
            ))}
            <button onClick={() => setActive((p) => (p + 1) % TESTIMONIALS.length)} className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
