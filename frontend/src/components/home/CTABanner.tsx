"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { FadeInUp } from "../ui/Utilities";

interface CTABannerProps {
  onAction: () => void;
}

export function CTABanner({ onAction }: CTABannerProps) {
  return (
    <section className="py-24 px-4 relative z-10 overflow-hidden">
      <FadeInUp>
        <div className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(249,115,79,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_50%)]" />

          {/* Floating orbs */}
          <motion.div
            className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-orange-500/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl"
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-white/10 flex items-center justify-center mx-auto mb-8"
            >
              <Sparkles className="w-6 h-6 text-orange-400" />
            </motion.div>

            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-5 leading-tight">
              Ready to automate your<br />
              <span className="serif-italic font-medium text-orange-300">Meta Ads growth?</span>
            </h2>
            <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Join thousands of founders who replaced their media buying team with AI agents that work 24/7.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onAction}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-[15px] font-black text-slate-900 shadow-xl shadow-black/20 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
              >
                Start Free — No Card Required
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-[15px] font-bold text-white/80 transition-all hover:bg-white/10 hover:text-white">
                Watch Demo
              </button>
            </div>

            <p className="mt-8 text-xs text-slate-500">
              ✦ Free forever plan · No credit card · Setup in 30 seconds
            </p>
          </div>
        </div>
      </FadeInUp>
    </section>
  );
}
