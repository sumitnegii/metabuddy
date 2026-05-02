"use client";

import React from "react";
import { motion } from "framer-motion";
import { Target, Eye, Sparkles, ChevronRight, Heart, MessageCircle, Share2, Bookmark, Zap, ThumbsUp } from "lucide-react";
import { Variant, AD_VARIANTS } from "../../lib/constants";

export function FacebookPreview({ variant, imageUrl }: { variant: Variant, imageUrl?: string }) {
  const v = AD_VARIANTS[variant];
  return (
    <motion.div key={`fb-${variant}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
      className="float-tile overflow-hidden bg-white w-full max-w-[340px] shadow-xl">
      <div className="p-3 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <Target size={18} />
        </div>
        <div>
          <p className="text-[12px] font-bold text-[#050505]">Your Brand</p>
          <p className="text-[10px] text-[#65676b] flex items-center gap-1">
            Sponsored · <Eye size={10} />
          </p>
        </div>
        <div className="ml-auto text-[#65676b] text-sm">•••</div>
      </div>
      <div className="px-3 pb-3">
        <p className="text-[13px] text-[#050505] leading-[1.3]">{v.hook}</p>
      </div>
      <div className="aspect-[1.91/1] relative overflow-hidden bg-slate-50 border-y border-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Sparkles size={32} className="mx-auto mb-2 text-slate-200" />
              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Ad Creative</p>
            </div>
          </div>
        )}
      </div>
      <div className="bg-[#f0f2f5] p-3 flex items-center justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-[11px] text-[#65676b] uppercase truncate">YOURBRAND.COM</p>
          <p className="text-[14px] font-bold text-[#050505] truncate">{v.headline}</p>
        </div>
        <button className="text-[12px] font-bold px-4 py-2 rounded-md bg-white border border-slate-300 text-[#050505] whitespace-nowrap shadow-sm">
          {v.cta}
        </button>
      </div>
    </motion.div>
  );
}

export function InstagramPreview({ variant, imageUrl }: { variant: Variant, imageUrl?: string }) {
  const v = AD_VARIANTS[variant];
  return (
    <motion.div key={`ig-${variant}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
      className="float-tile overflow-hidden bg-white w-full max-w-[340px] shadow-xl">
      <div className="p-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full p-[1.5px]" style={{ background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" }}>
          <div className="w-full h-full rounded-full bg-white p-[1.5px]">
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Sparkles size={12} />
            </div>
          </div>
        </div>
        <div>
          <p className="text-[12px] font-bold text-[#262626]">yourbrand</p>
          <p className="text-[10px] text-[#262626]">Sponsored</p>
        </div>
        <div className="ml-auto text-slate-900 text-lg leading-none pb-2">...</div>
      </div>
      <div className="aspect-square relative overflow-hidden bg-slate-50">
        {imageUrl ? (
          <img src={imageUrl} alt="Ad Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-200">
            <div className="text-center">
              <Zap size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-[10px] uppercase tracking-widest font-bold">Instagram Creative</p>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-4 mb-3">
          <Heart size={24} className="text-slate-900 stroke-[1.5]" />
          <MessageCircle size={24} className="text-slate-900 stroke-[1.5]" />
          <Share2 size={24} className="text-slate-900 stroke-[1.5]" />
          <Bookmark size={24} className="ml-auto text-slate-900 stroke-[1.5]" />
        </div>
        <p className="text-[13px] font-bold text-slate-900 mb-1.5">1,482 likes</p>
        <p className="text-[13px] text-slate-900 leading-snug">
          <span className="font-bold mr-1.5">yourbrand</span>
          {v.hook}
        </p>
        <button className="mt-4 w-full text-[13px] font-bold py-2.5 rounded-md text-white shadow-md active:scale-[0.98] transition-transform"
          style={{ background: "#3897f0" }}>{v.cta}</button>
      </div>
    </motion.div>
  );
}

export function StoryPreview({ variant, imageUrl }: { variant: Variant, imageUrl?: string }) {
  const v = AD_VARIANTS[variant];
  return (
    <motion.div key={`story-${variant}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
      className="float-tile overflow-hidden aspect-[9/16] bg-[#1a1a1a] relative w-full max-w-[340px] shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-transparent to-slate-900/60 z-10" />
      {imageUrl && (
        <img src={imageUrl} alt="Story Background" className="absolute inset-0 w-full h-full object-cover opacity-60" />
      )}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-white/80 p-0.5">
          <div className="w-full h-full rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">M</div>
        </div>
        <div>
          <p className="text-white text-[11px] font-bold">yourbrand</p>
          <p className="text-white/80 text-[9px]">Sponsored</p>
        </div>
      </div>
      <div className="h-full flex items-center justify-center text-white/10 relative z-0">
        {!imageUrl && <Sparkles size={80} />}
      </div>
      <div className="absolute bottom-10 inset-x-0 z-20 px-6 text-center">
        <h3 className="text-white text-xl font-bold mb-6 leading-tight">{v.headline}</h3>
        <button className="bg-white text-slate-900 font-bold px-8 py-3 rounded-xl text-sm shadow-xl active:scale-95 transition-transform">
          {v.cta}
        </button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <ChevronRight size={20} className="text-white/40 -rotate-90" />
      </div>
    </motion.div>
  );
}

