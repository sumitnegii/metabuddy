"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-20 px-4 bg-white border-t border-slate-100 relative z-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
                <Sparkles className="text-white" size={18} />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">MetaBuddy</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Automating Meta ads for the next generation of entrepreneurs.
            </p>
          </div>
          
          {[
            { title: "Features", links: ["Magic Copy", "Magic Preview", "Magic Launch", "Magic Agents"] },
            { title: "Company", links: ["About", "Pricing", "Blog", "Contact"] },
            { title: "Resources", links: ["Help Center", "Privacy", "Terms", "API"] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-[11px] font-bold text-orange-600 uppercase tracking-widest mb-3">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="h-px w-full bg-slate-100 mb-8" />
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">© 2026 MetaBuddy. All rights reserved.</p>
          <p className="text-xs text-slate-400">Made with ✦ for entrepreneurs</p>
        </div>
      </div>
    </footer>
  );
}
