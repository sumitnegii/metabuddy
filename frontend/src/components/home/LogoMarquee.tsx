"use client";

import { motion } from "framer-motion";

const BRANDS = [
  "Shopify", "Nike", "Glossier", "Airbnb", "Stripe",
  "Notion", "Figma", "Vercel", "Linear", "Loom",
  "Shopify", "Nike", "Glossier", "Airbnb", "Stripe",
  "Notion", "Figma", "Vercel", "Linear", "Loom",
];

export function LogoMarquee() {
  return (
    <section className="relative z-10 overflow-hidden border-y border-slate-100 bg-white/80 backdrop-blur-sm py-8">
      <p className="text-center text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-6">
        Trusted by 10,000+ growth teams worldwide
      </p>
      <div className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-white to-transparent" />
        <motion.div
          className="flex gap-16 whitespace-nowrap"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        >
          {BRANDS.map((brand, i) => (
            <span
              key={`${brand}-${i}`}
              className="text-xl font-black tracking-tight text-slate-300 select-none"
            >
              {brand}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
