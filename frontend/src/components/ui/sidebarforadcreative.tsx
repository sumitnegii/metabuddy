"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  GitBranch,
  Home,
  Layers3,
  LogOut,
  Sparkles,
} from "lucide-react";

import { clearSession } from "@/lib/session";

type SidebarSection = {
  id: string;
  label: string;
  icon: typeof Sparkles;
};

type AdCreativeSidebarProps = {
  sections: SidebarSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  tokens: number;
  cost: number;
};

const quickLinks = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Ad Tool", href: "/ad-creator", icon: BarChart3 },
  { label: "Campaigns", href: "/campaigns", icon: Layers3 },
];

export default function AdCreativeSidebar({
  sections,
  activeSection,
  onSectionChange,
  tokens,
  cost,
}: AdCreativeSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-white/10 bg-[#050505] px-4 py-5 text-white shadow-[18px_0_70px_rgba(0,0,0,0.28)]">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_12px_30px_rgba(249,115,22,0.32)]">
          <Sparkles className="h-5 w-5" strokeWidth={2.6} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">Ad Creative</p>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Meta forecast</p>
        </div>
      </div>

      <nav className="mt-5 grid gap-1">
        {sections.map((section) => {
          const active = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`flex h-12 items-center justify-between rounded-xl px-3 text-left text-sm font-black transition ${
                active ? "bg-white text-black" : "text-zinc-400 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <section.icon className="h-4 w-4" />
                {section.label}
              </span>
              <GitBranch className={`h-3.5 w-3.5 ${active ? "text-zinc-700" : "text-zinc-600"}`} />
            </button>
          );
        })}
      </nav>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">Usage</p>
        <p className="mt-3 text-3xl font-black">{tokens.toLocaleString()}</p>
        <p className="mt-1 text-xs font-semibold text-zinc-400">₹{cost.toFixed(4)} estimated</p>
      </div>

      <div className="mt-5 grid gap-1 border-t border-white/10 pt-5">
        {quickLinks.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-10 items-center gap-3 rounded-xl px-3 text-xs font-black transition ${
                active ? "bg-orange-500 text-white" : "text-zinc-500 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto grid gap-2">
        <Link href="/dashboard" className="flex h-10 items-center gap-3 rounded-xl px-3 text-xs font-black text-zinc-500 transition hover:bg-white/[0.07] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
        <button
          type="button"
          onClick={() => {
            clearSession();
            window.location.href = "/";
          }}
          className="flex h-10 items-center gap-3 rounded-xl px-3 text-xs font-black text-zinc-500 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
