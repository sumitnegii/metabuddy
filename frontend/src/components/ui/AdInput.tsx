"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import clsx from "clsx";

interface AdInputProps {
  onGenerate: (text: string) => void;
  size?: "md" | "lg";
  ctaLabel?: string;
}

const PLACEHOLDERS = [
  "I want to promote my fitness app",
  "I want to sell my online course",
  "I want leads for my real estate business",
  "I want to scale my jewelry brand",
  "I want to find customers for my agency",
];

export function AdInput({ onGenerate, size = "md", ctaLabel = "Start for free" }: AdInputProps) {
  const [text, setText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={clsx(
      "pill-input flex items-center gap-2 pr-2.5 transition-all group",
      size === "lg" ? "p-3 pl-6" : "p-2 pl-5"
    )}>
      <Sparkles size={size === "lg" ? 22 : 18} className="text-orange-500" />
      <input
        type="text"
        placeholder={PLACEHOLDERS[placeholderIndex]}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onGenerate(text)}
        className="flex-1 bg-transparent border-none outline-none text-slate-900 font-medium placeholder:text-slate-400 placeholder:transition-opacity"
        style={{ fontSize: size === "lg" ? "18px" : "15px" }}
      />
      <button
        onClick={() => onGenerate(text)}
        className={clsx(
          "btn-accent flex items-center gap-2 group-focus-within:scale-105 active:scale-95",
          size === "lg" ? "px-6 py-3" : "px-4 py-2"
        )}
      >
        <span className={size === "lg" ? "text-base" : "text-sm"}>{ctaLabel}</span>
        <ArrowRight size={size === "lg" ? 20 : 16} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}
