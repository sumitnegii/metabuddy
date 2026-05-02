"use client";

import React from "react";
import Link from "next/link";
import { Triangle } from "lucide-react";

interface NavbarProps {
  onStartFree: () => void;
  onLogin: () => void;
  onSignup: () => void;
  onLogout: () => void;
  isLoggedIn?: boolean;
}

export function Navbar({ onStartFree, onLogin, onSignup, onLogout, isLoggedIn = false }: NavbarProps) {
  return (
    <nav className="absolute top-0 inset-x-0 z-[100] flex items-center justify-between border-b border-white/70 bg-white/78 px-8 py-5 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-2 text-slate-950 transition hover:-translate-y-0.5">
        <div className="relative flex items-center justify-center">
          <Triangle className="w-6 h-6 stroke-[3] text-[#F9734F] -rotate-12 fill-[#F9734F]" />
        </div>
        <span className="font-bold text-2xl tracking-tight">MetaBuddy</span>
      </Link>

      <div className="hidden md:flex items-center gap-10 text-[15px] font-medium text-zinc-600">
        <a href="#how-it-works" className="hover:text-black transition-colors">How it works</a>
        <a href="#features" className="hover:text-black transition-colors">Features</a>
        <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
      </div>

      <div className="flex items-center gap-4">
        {isLoggedIn ? (
          <>
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center rounded-full px-6 py-2.5 text-[15px] font-bold text-zinc-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Dashboard
            </Link>
            <button
              onClick={onLogout}
              className="hidden md:inline-flex items-center px-6 py-2.5 rounded-full text-zinc-700 hover:text-red-600 hover:bg-red-50 text-[15px] font-bold transition-colors"
            >
              Log out
            </button>
            <button
              onClick={onStartFree}
              className="rounded-full bg-[#F9734F] px-6 py-2.5 text-[15px] font-black text-white shadow-[0_12px_26px_rgba(249,115,79,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#EF6542]"
            >
              Launch Campaign
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onLogin}
              className="hidden md:inline-flex items-center rounded-full px-6 py-2.5 text-[15px] font-bold text-zinc-700 transition-all hover:-translate-y-0.5 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Sign In
            </button>
            <button
              onClick={onSignup}
              className="rounded-full bg-[#F9734F] px-6 py-2.5 text-[15px] font-black text-white shadow-[0_12px_26px_rgba(249,115,79,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#EF6542]"
            >
              Start Free
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
