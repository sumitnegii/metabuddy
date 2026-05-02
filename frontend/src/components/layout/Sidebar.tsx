"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileText,
  Images,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Users,
  Triangle,
  Wand2,
} from "lucide-react";

import { clearSession } from "@/lib/session";

const navItems = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Create", href: "/generate", icon: Wand2 },
  { label: "Ad Tool", href: "/ad-creator", icon: Images },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Agents", href: "/contacts", icon: Users },
  { label: "Content", href: "/content", icon: FileText },
  { label: "Reports", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex w-[90px] flex-col items-center border-r border-white/70 bg-white/82 py-6 shadow-[10px_0_40px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <Link href="/dashboard" className="mb-10 rounded-2xl border border-orange-100 bg-orange-50 p-2 text-orange-600 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-orange-100 hover:shadow-md">
        <Triangle className="h-6 w-6 -rotate-12 fill-transparent stroke-[3]" />
      </Link>

      <nav className="flex w-full flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <div key={item.href} className="relative w-full px-2">
              {isActive && <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-md bg-orange-500" />}
              <Link
                href={item.href}
                className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl py-3 transition-all ${
                  isActive ? "bg-orange-50 text-orange-700 shadow-sm" : "text-zinc-400 hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
                title={item.label}
              >
                <item.icon className={`h-[22px] w-[22px] ${isActive ? "text-orange-700" : "text-zinc-400"}`} strokeWidth={isActive ? 2.5 : 1.5} />
                <span className={`text-[9px] font-bold ${isActive ? "text-orange-800" : "text-zinc-500"}`}>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto w-full px-2">
        <button
          onClick={() => {
            clearSession();
            window.location.href = "/";
          }}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl py-3 text-zinc-400 transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600"
          title="Log out"
        >
          <LogOut className="h-[22px] w-[22px]" strokeWidth={1.5} />
          <span className="text-[9px] font-bold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
