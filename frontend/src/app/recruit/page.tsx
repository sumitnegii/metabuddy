"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { Check, Plus, Star, Search, Filter, ShieldCheck, Zap } from "lucide-react";

export default function RecruitPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    try {
      const data = await api.getAgentDirectory();
      setAgents(data);
    } catch (e) {
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  };

  const handleHire = async (templateId: string) => {
    try {
      await api.hireAgent(templateId);
      fetchDirectory(); // refresh list to show hired status
    } catch (e: any) {
      alert(e.message || "Failed to hire agent");
    }
  };

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="flex-1 ml-[90px] p-8 max-w-[1200px] animate-in fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-black mb-2">Recruit Agents</h1>
            <p className="text-[15px] font-medium text-zinc-500">Build your AI marketing agency by hiring specialized autonomous agents.</p>
          </div>
          
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 rounded-[10px] border border-zinc-200 bg-white text-[13px] font-semibold text-black shadow-sm hover:bg-zinc-50 transition-colors">
              <Filter className="w-4 h-4" /> Role
            </button>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search agents..." 
                className="pl-10 pr-4 py-2 rounded-[10px] border border-zinc-200 text-[13px] font-semibold w-64 focus:outline-none focus:border-zinc-300 shadow-sm"
              />
            </div>
          </div>
        </div>        {/* Recruitment Guide */}
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-800" />
            <h2 className="text-lg font-bold tracking-tight text-black">Agent Agency Guide</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Hire Specialists", desc: "Recruit agents with specific skills for copy, audience analysis, or campaign management." },
              { title: "Set Budgets", desc: "Assign daily compute budgets to your agents in the 'Manage Agents' section." },
              { title: "Deploy Jobs", desc: "Hired agents become available in the Campaign Builder to work on your drafts." }
            ].map((step, idx) => (
              <div key={idx} className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Principle {idx + 1}</span>
                <h3 className="font-bold text-black">{step.title}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Directory Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-6">
            {[1,2,3,4,5].map(i => <div key={i} className="h-[300px] bg-zinc-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.templateId} className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                
                {agent.isHired && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" /> Hired
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-2xl border border-zinc-200/50 shadow-sm">
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black leading-tight">{agent.name}</h3>
                    <p className="text-[13px] font-semibold text-zinc-500 mt-1">{agent.role}</p>
                  </div>
                </div>

                <p className="text-[14px] text-zinc-600 mb-6 leading-relaxed flex-1">
                  {agent.bio}
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex flex-wrap gap-2">
                    {agent.skills.map((skill: string) => (
                      <span key={skill} className="px-2.5 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] font-semibold text-zinc-600">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-[#FFCC00] fill-[#FFCC00]" />
                      <span className="text-[13px] font-bold text-black">{agent.performanceScore}</span>
                      <span className="text-[11px] font-medium text-zinc-400">Score</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-500" />
                      <span className="text-[13px] font-bold text-black">${agent.costPerTask.toFixed(2)}</span>
                      <span className="text-[11px] font-medium text-zinc-400">/task</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => !agent.isHired && handleHire(agent.templateId)}
                  disabled={agent.isHired}
                  className={`w-full py-3 rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 transition-all ${
                    agent.isHired 
                      ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                      : "bg-[#FFCC00] text-black hover:bg-[#F2C200] shadow-sm"
                  }`}
                >
                  {agent.isHired ? "Already on Team" : <><Plus className="w-4 h-4" /> Hire Agent</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
