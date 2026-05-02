"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check, Loader2, ChevronRight, MessageCircle, Heart, Share2, Bookmark } from "lucide-react";
import clsx from "clsx";
import { FacebookPreview, InstagramPreview, StoryPreview } from "../ads/AdPreviews";
import { Variant, AGENT_BADGE } from "../../lib/constants";
import { getAnalyzingSteps, getGeneratingSteps } from "../../lib/agent-simulation";
import { api } from "../../lib/api";
import { useRouter } from "next/navigation";

interface AdModalProps {
  open: boolean;
  onClose: () => void;
  userInput: string;
}

const AD_IMAGES = {
  A: "/ads/watch.png",
  B: "/ads/sneaker.png",
  C: "/ads/gym.png"
};

export function AdModal({ open, onClose, userInput }: AdModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<"analyzing" | "generating" | "complete">("analyzing");
  const [currentVariant, setCurrentVariant] = useState<Variant>("A");
  const [activeTab, setActiveTab] = useState<"facebook" | "instagram" | "story">("facebook");
  const [displayText, setDisplayText] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const imageUrl = AD_IMAGES[currentVariant];


  const analyzingSteps = getAnalyzingSteps();
  const generatingSteps = getGeneratingSteps();

  useEffect(() => {
    if (open) {
      setStep("analyzing");
      setIsLaunching(false);
      setDisplayText(userInput);
      
      const timer1 = setTimeout(() => setStep("generating"), 3000);
      const timer2 = setTimeout(() => setStep("complete"), 6500);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [open, userInput]);

    const handleLaunch = async () => {
    setIsLaunching(true);
    try {
      const res = await api.generateIdea(userInput, 'gemini');
      if (res && res._id) {

        router.push(`/campaign/${res._id}`);
      } else {
        throw new Error("Failed to create campaign");
      }
    } catch (err) {
      setIsLaunching(false);
      console.error("Launch error:", err);
      alert("Launch failed. Please try again.");
    }
  };


  if (!open) return null;


  return (
    <AnimatePresence>
      <motion.div key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(30px) saturate(150%)" }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto"
          style={{
            background: "#ffffff",
            borderRadius: "32px",
            boxShadow: "0 40px 100px rgba(15,23,42,0.22), 0 12px 32px rgba(15,23,42,0.08)",
            border: "1px solid rgba(15,23,42,0.04)",
          }}>
          {/* Top accent bar */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #ff6b47, #ff9466, #fbbf24, #c4b5fd, #6366f1)" }} />

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.2em] bg-orange-50 px-2 py-0.5 rounded">✦ Creation Engine</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Processing</span>
              </div>
              <h2 className="text-xl sm:text-2xl heading leading-tight">
                Generating ads for <span className="serif-italic text-slate-500">"{displayText.slice(0, 30)}{displayText.length > 30 ? "..." : ""}"</span>
              </h2>
            </div>
            <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-900 active:scale-90">
              <X size={20} />
            </button>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Left Column: Progress / Steps */}
              <div className="lg:col-span-4 space-y-8">
                <div className="space-y-6">
                  {/* Step: Analyzing */}
                  <div className="relative">
                    <div className={clsx(
                      "flex items-center gap-3 mb-4 transition-opacity",
                      step !== "analyzing" && "opacity-50"
                    )}>
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        step === "analyzing" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {step !== "analyzing" ? <Check size={16} /> : "1"}
                      </div>
                      <span className="font-bold text-slate-900">Analyzing Idea</span>
                    </div>
                    {step === "analyzing" && (
                      <div className="pl-11 space-y-3">
                        {analyzingSteps.map((s, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.5 }}
                            className="flex items-center gap-2 text-sm text-slate-500">
                            <div className="w-1 h-1 rounded-full bg-slate-300" />
                            {s}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step: Generating */}
                  <div className="relative">
                    <div className={clsx(
                      "flex items-center gap-3 mb-4 transition-opacity",
                      step === "analyzing" && "opacity-20",
                      step === "complete" && "opacity-50"
                    )}>
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        step === "generating" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" :
                        step === "complete" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        {step === "complete" ? <Check size={16} /> : "2"}
                      </div>
                      <span className="font-bold text-slate-900">Magic Copywriting</span>
                    </div>
                    {step === "generating" && (
                      <div className="pl-11 space-y-3">
                        {generatingSteps.map((s, i) => (
                          <motion.div key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.5 }}
                            className="flex items-center gap-2 text-sm text-slate-500">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                            {s}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step: Complete */}
                  <div className="relative">
                    <div className={clsx(
                      "flex items-center gap-3 transition-opacity",
                      step !== "complete" && "opacity-20"
                    )}>
                      <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        step === "complete" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-slate-100 text-slate-400"
                      )}>
                        3
                      </div>
                      <span className="font-bold text-slate-900">Ready to Launch</span>
                    </div>
                    {step === "complete" && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-11 mt-4">
                        <p className="text-sm text-slate-500 leading-relaxed mb-4">
                          Your ad variations are generated and optimized for high performance.
                        </p>
                        <button 
                          onClick={handleLaunch}
                          disabled={isLaunching}
                          className="btn-accent w-full py-3.5 shadow-xl flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isLaunching ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              <span>Launching...</span>
                            </>
                          ) : (
                            <>
                              <span>Launch to Meta</span>
                              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </>
                          )}
                        </button>

                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Previews */}
              <div className="lg:col-span-8 bg-slate-50/50 rounded-3xl p-6 border border-slate-100 min-h-[560px] relative overflow-hidden">
                {step !== "complete" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm z-10">
                    <div className="w-16 h-16 relative mb-4">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
                      <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin" />
                    </div>
                    <p className="text-slate-900 font-bold tracking-tight">AI Agent at work...</p>
                    <p className="text-slate-400 text-xs mt-1">Drafting high-performing variants</p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between mb-8">
                  <div className="flex gap-1.5 p-1 bg-white rounded-xl shadow-sm border border-slate-100">
                    {(["facebook", "instagram", "story"] as const).map(tab => (
                      <button key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={clsx(
                          "px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize",
                          activeTab === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                        )}>
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    {(["A", "B", "C"] as Variant[]).map(v => (
                      <button key={v}
                        onClick={() => setCurrentVariant(v)}
                        className={clsx(
                          "w-9 h-9 rounded-full text-xs font-bold transition-all border",
                          currentVariant === v ? "var-active" : "bg-white text-slate-400 hover:border-slate-300"
                        )}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center">
                  <AnimatePresence mode="wait">
                    {activeTab === "facebook" && <FacebookPreview key={currentVariant} variant={currentVariant} imageUrl={imageUrl} />}
                    {activeTab === "instagram" && <InstagramPreview key={currentVariant} variant={currentVariant} imageUrl={imageUrl} />}
                    {activeTab === "story" && <StoryPreview key={currentVariant} variant={currentVariant} imageUrl={imageUrl} />}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
