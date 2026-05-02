"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { Check, X, Inbox, Clock, Edit3, MessageSquare } from "lucide-react";

export default function ContentPage() {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const data = await api.getPendingContent();
      setContent(data);
    } catch (e) {
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (campaignId: string, copyId: string, status: 'approved' | 'rejected') => {
    // Optimistic UI update
    setContent(prev => prev.filter(c => c.copyId !== copyId));
    try {
      await api.approveContent(campaignId, copyId, status);
    } catch (e) {
      alert("Failed to update status");
      fetchContent(); // revert if failed
    }
  };

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="flex-1 ml-[90px] p-8 max-w-[1200px] animate-in fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-black mb-2">Content Inbox</h1>
            <p className="text-[15px] font-medium text-zinc-500">Review and approve ad creatives submitted by your AI team.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-[10px] text-[13px] font-bold text-zinc-600">
            <Clock className="w-4 h-4 text-zinc-400" /> {content.length} Pending Approvals
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-6 max-w-4xl">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="h-48 bg-zinc-100 rounded-2xl animate-pulse" />)
          ) : content.length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-16 text-center shadow-sm">
              <Inbox className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-black mb-1">Inbox Zero</h3>
              <p className="text-sm text-zinc-500">Your AI agents have no pending content for approval.</p>
            </div>
          ) : content.map((item) => (
            <div key={item.copyId} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative group">
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3 py-1 bg-zinc-100 text-zinc-600 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  {item.platform}
                </span>
                <span className="text-[13px] font-semibold text-zinc-400 border-l border-zinc-200 pl-2">
                  Campaign: <span className="text-black">{item.campaignIdea}</span>
                </span>
                <span className="text-[13px] font-semibold text-zinc-400 border-l border-zinc-200 pl-2">
                  Stage: <span className="text-black capitalize">{item.funnelStage}</span>
                </span>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Headline</h4>
                  <p className="text-[16px] font-bold text-black leading-tight">{item.headline}</p>
                </div>
                {item.hook && (
                  <div>
                    <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Hook</h4>
                    <p className="text-[14px] font-semibold text-black leading-snug">{item.hook}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Primary Text</h4>
                  <p className="text-[14px] text-zinc-600 leading-relaxed whitespace-pre-wrap">{item.body}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-6">
                <button className="flex items-center gap-2 text-[13px] font-bold text-zinc-400 hover:text-emerald-700 transition-colors">
                  <Edit3 className="w-4 h-4" /> Edit Copy
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleAction(item.campaignId, item.copyId, 'rejected')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-red-50 text-red-600 hover:bg-red-100 text-[13px] font-bold transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={3} /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(item.campaignId, item.copyId, 'approved')}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-emerald-600 text-white hover:bg-emerald-700 text-[13px] font-bold shadow-sm transition-colors"
                  >
                    <Check className="w-4 h-4" strokeWidth={3} /> Approve to Publish
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
