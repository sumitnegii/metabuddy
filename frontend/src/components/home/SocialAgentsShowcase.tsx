"use client";

import { motion } from "framer-motion";
import { BarChart3, CalendarClock, Camera, CheckCircle2, MessageCircle, Send, Sparkles, ThumbsUp, Users, Wand2 } from "lucide-react";
import { FadeInUp } from "../ui/Utilities";

const platforms = [
  { name: "Instagram", metric: "+34% saves", tone: "from-pink-100 to-orange-100", icon: Camera },
  { name: "Facebook", metric: "2.8x ROAS", tone: "from-blue-100 to-sky-100", icon: ThumbsUp },
  { name: "Comments", metric: "12 replies", tone: "from-emerald-100 to-teal-100", icon: MessageCircle },
];

const tasks = [
  { agent: "Creative Agent", action: "Generated 4 Reels hooks", icon: Wand2, color: "text-orange-600" },
  { agent: "Scheduler", action: "Queued 6 posts for peak hours", icon: CalendarClock, color: "text-blue-600" },
  { agent: "Engagement Agent", action: "Drafted brand-safe replies", icon: MessageCircle, color: "text-emerald-600" },
  { agent: "Growth Analyst", action: "Flagged best content angle", icon: BarChart3, color: "text-violet-600" },
];

const socialAgents = [
  { name: "Planner", initials: "PL", work: "Calendar", tone: "from-orange-200 to-amber-100", x: "8%", y: "34%" },
  { name: "Creator", initials: "CR", work: "Creative", tone: "from-pink-200 to-rose-100", x: "32%", y: "18%" },
  { name: "Reply", initials: "RP", work: "DMs", tone: "from-emerald-200 to-teal-100", x: "57%", y: "33%" },
  { name: "Analyst", initials: "AN", work: "Reports", tone: "from-blue-200 to-sky-100", x: "78%", y: "17%" },
];

export function SocialAgentsShowcase() {
  return (
    <section className="relative z-10 overflow-hidden px-4 py-28">
      <div className="absolute inset-x-0 top-16 mx-auto h-72 max-w-5xl opacity-80 bg-[linear-gradient(115deg,rgba(249,115,79,0.10),transparent_42%),linear-gradient(245deg,rgba(16,185,129,0.09),transparent_45%)]" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <FadeInUp>
          <span className="section-label accent-text mb-4">✦ Social autopilot</span>
          <h2 className="heading text-4xl sm:text-5xl">
            Agents manage your <span className="serif-italic font-medium text-slate-700">social engine.</span>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-500">
            Plan posts, generate captions, respond to customers, and watch performance signals without living inside every social app.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              "Post calendar and publishing queue",
              "Caption, hook, and creative angle generation",
              "Comment triage with approval controls",
              "Social content insights for next ads",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/75 p-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </FadeInUp>

        <div className="relative min-h-[700px]">
          <div className="absolute inset-0 rounded-[36px] border border-white/70 bg-white/55 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur-2xl" />
          <div className="absolute inset-4 rounded-[28px] bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[length:32px_32px]" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65 }}
            className="absolute left-8 top-8 right-8 rounded-3xl border border-white/80 bg-white/88 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.10)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-900">Today&apos;s social queue</p>
                <p className="text-xs font-semibold text-slate-500">4 channels · 11 scheduled actions</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Auto-ready</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {platforms.map((platform, index) => (
                <motion.div
                  key={platform.name}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3.8 + index * 0.35, repeat: Infinity, ease: "easeInOut" }}
                  className={`rounded-2xl bg-gradient-to-br ${platform.tone} p-4 text-left shadow-sm`}
                >
                  <platform.icon className="mb-6 h-5 w-5 text-slate-700" />
                  <p className="text-sm font-black text-slate-900">{platform.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-600">{platform.metric}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.08, duration: 0.65 }}
            className="absolute left-6 right-6 top-[236px] h-[178px] overflow-hidden rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600" />
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">AI team working together</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm">Live loop</span>
            </div>

            <div className="relative h-[112px]">
              <svg className="absolute inset-x-8 top-8 h-16 w-[calc(100%-4rem)]" viewBox="0 0 520 90" aria-hidden="true">
                <motion.path
                  d="M20 48 C105 8 145 9 220 47 S370 92 500 26"
                  fill="none"
                  stroke="rgba(249,115,79,0.28)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="10 16"
                  animate={{ strokeDashoffset: [0, -52] }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
                />
                <path d="M22 48 C105 8 145 9 220 47 S370 92 500 26" fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="2" strokeLinecap="round" />
              </svg>

              {socialAgents.map((agent, index) => (
                <motion.div
                  key={agent.name}
                  className="absolute w-[92px] text-center"
                  style={{ left: agent.x, top: agent.y }}
                  animate={{ y: [0, -7, 0], rotate: [-1, 1, -1] }}
                  transition={{ duration: 3.4 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${agent.tone} text-sm font-black text-slate-800 shadow-[0_12px_28px_rgba(15,23,42,0.14)] ring-4 ring-white`}>
                    {agent.initials}
                  </div>
                  <div className="mx-auto mt-1 h-5 w-10 rounded-b-full border-b-4 border-l-4 border-r-4 border-white bg-slate-100 shadow-sm" />
                  <p className="mt-1 text-[11px] font-black text-slate-900">{agent.name}</p>
                  <p className="text-[10px] font-bold text-slate-500">{agent.work}</p>
                </motion.div>
              ))}

              {["post queued", "reply drafted", "hook improved"].map((label, index) => (
                <motion.span
                  key={label}
                  className="absolute rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm"
                  style={{ left: `${18 + index * 28}%`, bottom: `${index % 2 ? 4 : 0}px` }}
                  animate={{ opacity: [0.55, 1, 0.55], y: [0, -4, 0] }}
                  transition={{ duration: 3.2 + index * 0.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {label}
                </motion.span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.15, duration: 0.65 }}
            className="absolute left-8 top-[446px] w-[315px] rounded-3xl border border-white/80 bg-white/88 p-4 text-left shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Agent activity</p>
            </div>
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.agent}
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 3 + index * 0.25, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <task.icon className={`mt-0.5 h-4 w-4 ${task.color}`} />
                  <div>
                    <p className="text-sm font-black text-slate-900">{task.agent}</p>
                    <p className="text-xs font-semibold text-slate-500">{task.action}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ delay: 0.28, duration: 0.65 }}
            className="absolute bottom-8 right-8 w-[340px] rounded-3xl border border-white/80 bg-white/90 p-5 text-left shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">Approval draft</p>
              <Send className="h-4 w-4 text-orange-600" />
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Caption</p>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-800">
                New drop is live. Built for everyday shine, styled for the moments that matter.
              </p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["9:30 AM", "Reel", "Needs OK"].map((chip) => (
                <div key={chip} className="rounded-xl bg-orange-50 px-3 py-2 text-center text-[11px] font-black text-orange-700">
                  {chip}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
