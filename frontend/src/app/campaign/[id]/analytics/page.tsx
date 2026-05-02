"use client";
import { useEffect, useState, use } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { Campaign, Ad } from "@/types/index";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { 
  ArrowLeft, RefreshCw, TrendingUp, TrendingDown, DollarSign, Target, MousePointer2, Activity,
  AlertCircle, CheckCircle2, ExternalLink, Search, Sparkles, Bot, Zap, ChevronRight, BrainCircuit, Globe
} from "lucide-react";

const COLORS = ['#000000', '#7c3aed', '#10b981', '#f59e0b', '#ef4444'];
const tooltipStyle = { 
  backgroundColor: '#ffffff', 
  borderRadius: '16px', 
  border: 'none', 
  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
  fontSize: 12,
  fontWeight: 'bold'
};

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<Campaign | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setLoading(true);
    try {
      const [camp, adsData] = await Promise.all([api.getCampaign(id), api.getCampaignAds(id)]);
      setC(camp);
      setAds(adsData);
    } catch (err) {} 
    finally { setLoading(false); setIsRefreshing(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  if (!c && loading) return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-72 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-zinc-100 border-t-black rounded-full animate-spin" />
      </main>
    </div>
  );

  if (!c) return (
    <div className="flex min-h-screen bg-white text-black">
      <Sidebar />
      <main className="flex-1 ml-72 flex items-center justify-center p-20">
        <div className="text-center space-y-8">
          <div className="w-24 h-24 bg-zinc-50 rounded-[40px] flex items-center justify-center mx-auto shadow-sm">
            <AlertCircle className="w-10 h-10 text-zinc-300" />
          </div>
          <h2 className="text-4xl font-black tracking-tighter">Engine Not Found.</h2>
          <Link href="/dashboard" className="btn-primary h-14 px-10">Return to HQ</Link>
        </div>
      </main>
    </div>
  );

  const totalSpend = ads.reduce((acc, ad) => acc + (ad.latestPerformance?.spend || 0), 0);
  const totalLeads = ads.reduce((acc, ad) => acc + (ad.latestPerformance?.leads || 0), 0);
  const totalClicks = ads.reduce((acc, ad) => acc + (ad.latestPerformance?.clicks || 0), 0);
  const totalImpressions = ads.reduce((acc, ad) => acc + (ad.latestPerformance?.impressions || 0), 0);
  const avgCtr = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  
  const targetCtr = parseFloat(c.strategy?.kpiTargets?.ctr?.replace('%', '') || "2.5");
  const chartData = ads.map((ad, idx) => ({
    name: `Variant ${idx + 1}`,
    ctr: ad.latestPerformance?.ctr || 0,
    leads: ad.latestPerformance?.leads || 0,
    spend: ad.latestPerformance?.spend || 0,
  }));

  return (
    <div className="flex min-h-screen bg-[#f9fafb] text-black">
      <Sidebar />
      <main className="flex-1 ml-72 p-12 animate-in">
        
        {/* Header */}
        <header className="flex items-end justify-between mb-12">
          <div className="flex items-center gap-8">
            <Link href={`/campaign/${id}`} className="p-4 rounded-3xl bg-white border border-zinc-100 text-zinc-400 hover:text-black shadow-sm transition-all">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-5xl font-black tracking-tighter">Live Intelligence</h1>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{c.idea}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active Monitoring</span>
              </div>
            </div>
          </div>
          <button onClick={() => loadData(true)} disabled={isRefreshing} className="btn-secondary h-12">
            <RefreshCw className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync Real-time Data
          </button>
        </header>

        {/* 🧠 AI Optimization Panel */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          <div className="col-span-8 saas-card bg-black text-white p-12 relative overflow-hidden group">
            <BrainCircuit className="absolute -right-12 -top-12 w-64 h-64 text-white/5 group-hover:scale-110 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/10 text-[10px] font-black text-[#7c3aed] uppercase tracking-widest mb-8">
                <Zap className="w-4 h-4" />
                Learning Agent Intelligence
              </div>
              <h2 className="text-5xl font-black tracking-tight leading-tight mb-8 max-w-2xl">
                {avgCtr < targetCtr ? "Performance Gap Detected. Initiating Payout Protocol." : "System Peak Performance. Scaling Profitable Nodes."}
              </h2>
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Autonomous Actions</h4>
                   <div className="space-y-4">
                     <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/5">
                        <TrendingUp className="w-5 h-5 text-emerald-400 mt-1" />
                        <div>
                          <p className="text-sm font-black text-white">Scaling Variant #3</p>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1">+20% Budget shift automatically applied.</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4 p-5 rounded-3xl bg-white/5 border border-white/5">
                        <Target className="w-5 h-5 text-blue-400 mt-1" />
                        <div>
                          <p className="text-sm font-black text-white">Audience Refinement</p>
                          <p className="text-[10px] font-bold text-zinc-500 mt-1">Excluding low-intent segments from Google Search.</p>
                        </div>
                     </div>
                   </div>
                </div>
                <div className="space-y-8">
                  <div className="p-8 rounded-[40px] bg-zinc-900 border border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Optimization Accuracy</p>
                    <p className="text-5xl font-black text-white">94.2%</p>
                    <div className="mt-6 w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7c3aed] transition-all duration-1000" style={{ width: '94.2%' }} />
                    </div>
                  </div>
                  <button className="w-full btn-accent h-14">Apply Agent Suggestions</button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-4 space-y-8">
            <div className="saas-card p-10 flex flex-col items-center text-center justify-center h-full">
              <p className="text-xs font-black text-zinc-300 uppercase tracking-widest mb-4">Total Revenue Generated</p>
              <p className="text-6xl font-black tracking-tighter mb-4">₹1.24L</p>
              <div className="inline-flex items-center gap-2 text-emerald-500 font-black text-sm">
                <TrendingUp className="w-5 h-5" />
                +24.8% <span className="text-zinc-300 font-bold ml-1">vs target</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-4 gap-8 mb-12">
           {[
             { label: "Total Spend", value: `₹${totalSpend.toLocaleString()}`, icon: DollarSign, color: "text-black", bg: "bg-zinc-100" },
             { label: "Leads", value: totalLeads, icon: Target, color: "text-emerald-500", bg: "bg-emerald-50" },
             { label: "Reach", value: "52.4k", icon: Globe, color: "text-[#7c3aed]", bg: "bg-[#7c3aed]/10" },
             { label: "Avg CTR", value: `${avgCtr}%`, icon: MousePointer2, color: "text-black", bg: "bg-zinc-100" },
           ].map((k, i) => (
             <div key={i} className="stat-card">
                <div className={`p-4 rounded-2xl ${k.bg} ${k.color} mb-6 w-fit`}><k.icon className="w-6 h-6" /></div>
                <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-1">{k.label}</p>
                <p className="text-3xl font-black">{k.value}</p>
             </div>
           ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-12 gap-8 mb-12">
          <div className="col-span-12 saas-card p-12">
            <div className="flex items-center justify-between mb-12">
               <h3 className="text-2xl font-black tracking-tight">Performance Matrix</h3>
               <div className="flex gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-black" />
                    <span className="text-[10px] font-black uppercase text-zinc-400">Leads Generated</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#7c3aed]" />
                    <span className="text-[10px] font-black uppercase text-zinc-400">Budget Spent</span>
                  </div>
               </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="0 0" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 900, fill: '#000' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f9fafb' }} />
                  <Bar dataKey="leads" fill="#000000" radius={[12, 12, 0, 0]} barSize={40} />
                  <Bar dataKey="spend" fill="#7c3aed" radius={[12, 12, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed List */}
        <div className="saas-card p-0 overflow-hidden">
          <div className="p-10 border-b border-zinc-50 flex items-center justify-between">
            <h3 className="text-2xl font-black tracking-tight">Node Data Breakdown</h3>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-300" />
              <input type="text" placeholder="Filter nodes..." className="rounded-full border border-zinc-100 bg-white pl-12 pr-6 py-3 text-sm font-bold outline-none w-80" />
            </div>
          </div>
          <table className="w-full text-left">
            <thead>
               <tr className="bg-zinc-50/50 text-[10px] font-black uppercase tracking-widest text-zinc-300">
                 <th className="px-10 py-6">Ad Variant</th>
                 <th className="px-10 py-6">Platform Status</th>
                 <th className="px-10 py-6 text-right">Spend</th>
                 <th className="px-10 py-6 text-right">CTR</th>
                 <th className="px-10 py-6 text-right">Leads</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {ads.map((ad, idx) => (
                <tr key={ad._id} className="group hover:bg-zinc-50/50 transition-all">
                  <td className="px-10 py-10">
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-3xl bg-zinc-100 flex items-center justify-center font-black group-hover:bg-black group-hover:text-white transition-all">{idx + 1}</div>
                       <div>
                         <p className="text-base font-black tracking-tight">Variant {idx+1}</p>
                         <p className="text-xs font-bold text-zinc-400 italic mt-1 line-clamp-1">&quot;{ad.hook}&quot;</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-10">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live: {ad.platform}
                    </span>
                  </td>
                  <td className="px-10 py-10 text-right font-black">₹{ad.latestPerformance?.spend || 0}</td>
                  <td className="px-10 py-10 text-right">
                    <span className="px-4 py-1.5 rounded-2xl bg-zinc-100 text-black font-black text-sm">{ad.latestPerformance?.ctr || 0}%</span>
                  </td>
                  <td className="px-10 py-10 text-right">
                    <p className="text-lg font-black text-black">{ad.latestPerformance?.leads || 0}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Generated</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}