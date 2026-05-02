import React from "react";
import { Sparkles, Brain, Rocket, DollarSign, Target, Zap, Heart, Check, TrendingUp, BarChart2, GitBranch, Camera, MessageCircle, Share2, Bookmark } from "lucide-react";

export type Tab = "facebook" | "instagram" | "story";
export type Variant = "A" | "B" | "C";
export type AgentType = "analyze" | "scale" | "pause" | "generate" | "info";

export interface AdVariant {
  hook: string;
  headline: string;
  cta: string;
}

export const AD_VARIANTS: Record<Variant, AdVariant> = {
  A: {
    hook: "Tired of complicated ad managers? MetaBuddy builds and launches your campaigns in 30 seconds. No expertise required.",
    headline: "The AI Engine for Your Meta Ads",
    cta: "Start Free",
  },
  B: {
    hook: "Stop guessing. Start selling. Our AI agent finds your winners and scales them automatically 24/7.",
    headline: "Idea to Revenue in 3 clicks",
    cta: "Launch Now",
  },
  C: {
    hook: "Join 350,000+ entrepreneurs using MetaBuddy to automate their growth. High ROAS, zero stress.",
    headline: "Automate Your Meta Ads Today",
    cta: "Get Started",
  }
};

export const FEATURES = [
  { icon: <Sparkles size={20} />, label: "AI GENERATION", title: "Magic Copy & Creative", desc: "No more writer's block. AI generates high-converting hooks, headlines, and visuals." },
  { icon: <Zap size={20} />,      label: "ONE-CLICK",    title: "Instant Launch",      desc: "Pushed directly to Facebook & Instagram. No manual setup or complex settings." },
  { icon: <Brain size={20} />,    label: "AUTO-PILOT",   title: "Agent Optimization",  desc: "AI agents monitor performance 24/7, pausing losers and scaling winners automatically." },
  { icon: <BarChart2 size={20} />,label: "ANALYTICS",    title: "Revenue Tracking",    desc: "See exactly where every dollar goes. Real-time ROAS, CPC, and conversion data." },
  { icon: <Rocket size={20} />,   label: "SCALING",      title: "Vertical Growth",     desc: "When an ad hits, our agent automatically increases budget to maximize your profit." },
  { icon: <DollarSign size={20} />,label: "EFFICIENCY",   title: "Lower CPC",           desc: "AI targeting finds your cheapest customers, saving you up to 40% on ad spend." },
];

export const PRICING = [
  { name: "Starter",  price: "Free", period: "/forever", desc: "For new entrepreneurs", features: ["1 Active Campaign", "AI Ad Generation", "Standard Targeting", "Basic Analytics"], cta: "Get Started" },
  { name: "Growth",   price: "$49",  period: "/month",   desc: "For scaling brands",    features: ["Unlimited Campaigns", "Advanced AI Agents", "Custom Audiences", "Priority Support", "Real-time Scaling"], cta: "Start 7-day Trial", featured: true },
  { name: "Pro",      price: "$199", period: "/month",   desc: "For agencies & teams",  features: ["Multi-account Support", "Custom AI Models", "White-label Reports", "API Access", "Dedicated Manager"], cta: "Contact Sales" },
];

export const AGENT_BADGE: Record<AgentType, { label: string; class: string }> = {
  analyze:  { label: "Analyzing",  class: "badge-blue" },
  scale:    { label: "Scaling",    class: "badge-green" },
  pause:    { label: "Optimizing", class: "badge-red" },
  generate: { label: "Creative",   class: "badge-coral" },
  info:     { label: "System",     class: "badge-yellow" },
};
