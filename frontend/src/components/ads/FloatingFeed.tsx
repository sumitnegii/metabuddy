"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { FacebookPreview, InstagramPreview } from "./AdPreviews";

export function FloatingFeed() {
  return (
    <section className="py-32 px-4 relative z-10 overflow-hidden bg-[#fafafa]">
      <div className="max-w-6xl mx-auto mb-20 text-center">
        <span className="section-label accent-text mb-4">✦ Already live</span>
        <h2 className="heading text-5xl sm:text-7xl mb-8 tracking-tight">
          Your ads <span className="serif-italic font-medium text-slate-700">floating in the feed.</span>
        </h2>
        <p className="muted-text text-xl max-w-3xl mx-auto leading-relaxed">
          Experience the "scroll illusion." This is exactly how your brand will look to millions of customers on Facebook and Instagram.
        </p>
      </div>

      <div className="relative h-[800px] sm:h-[1000px] w-full overflow-hidden">
        {/* Top/Bottom Fade mask */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#fafafa] to-transparent z-20 pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#fafafa] to-transparent z-20 pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto px-4 h-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-16">
          {/* Column 1: Slow Up */}
          <motion.div 
            animate={{ y: [0, -1400] }} 
            transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-12">
            {[...Array(6)].map((_, i) => (
              <div key={`c1-${i}`} className={i % 2 === 0 ? "scale-90 opacity-40 blur-[2px]" : "scale-100 opacity-100"}>
                <FacebookPreview variant={i % 3 === 0 ? "A" : "B"} imageUrl={i === 1 ? "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop" : undefined} />
              </div>
            ))}
          </motion.div>

          {/* Column 2: Faster Down */}
          <motion.div 
            animate={{ y: [-1400, 0] }} 
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-12 pt-60 hidden sm:flex">
            {[...Array(6)].map((_, i) => (
              <div key={`c2-${i}`} className={i % 3 === 0 ? "scale-105 opacity-100 z-10" : "scale-95 opacity-60 blur-[1px]"}>
                <InstagramPreview variant={i % 3 === 1 ? "B" : "C"} imageUrl={i === 0 ? "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600&auto=format&fit=crop" : undefined} />
              </div>
            ))}
          </motion.div>

          {/* Column 3: Very Fast Up */}
          <motion.div 
            animate={{ y: [0, -1600] }} 
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex flex-col gap-12 pt-32 hidden lg:flex">
            {[...Array(8)].map((_, i) => (
              <div key={`c3-${i}`} className={i % 4 === 0 ? "scale-100 opacity-100" : "scale-90 opacity-40 blur-[2px]"}>
                <FacebookPreview variant={i % 3 === 2 ? "C" : "A"} imageUrl={i === 4 ? "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop" : undefined} />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
