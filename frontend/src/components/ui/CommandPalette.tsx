"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Wand2, Megaphone, Settings, X, BarChart3 } from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!open) return null;

  const actions = [
    { id: "generate", name: "Generate New Campaign", icon: Wand2, shortcut: "G", href: "/generate" },
    { id: "campaigns", name: "View All Campaigns", icon: Megaphone, shortcut: "C", href: "/dashboard" },
    { id: "usage", name: "AI Usage & Limits", icon: BarChart3, shortcut: "U", href: "/agents/usage" },
    { id: "settings", name: "Workspace Settings", icon: Settings, shortcut: "S", href: "/settings" },
  ];

  const filtered = actions.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch("");
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-background rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
            placeholder="Type a command or search..."
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0].href);
            }}
          />
          <button onClick={() => setOpen(false)} className="p-1 rounded-md text-muted-foreground hover:bg-secondary transition-fast">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">No results found.</p>
          ) : (
            <div className="space-y-1">
              <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Suggestions</p>
              {filtered.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleSelect(action.href)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-secondary transition-fast group text-left"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-fast" />
                    <span className="font-medium">{action.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-background border border-border rounded shadow-sm text-muted-foreground">
                      ⌘
                    </kbd>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-background border border-border rounded shadow-sm text-muted-foreground">
                      {action.shortcut}
                    </kbd>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
