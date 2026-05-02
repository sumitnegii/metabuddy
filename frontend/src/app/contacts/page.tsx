"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { Users, Settings, Activity, BrainCircuit, Search } from "lucide-react";
import Link from "next/link";

type Agent = {
  _id: string;
  avatar?: string;
  name: string;
  role: string;
  model?: string;
  status: "idle" | "working" | "paused";
  performanceScore: number;
  tasksCompleted: number;
};

export default function ContactsPage() {
  const [team, setTeam] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getAgentTeam()
      .then((data) => {
        if (active) setTeam(data);
      })
      .catch(() => {
        window.location.href = "/";
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateStatus = async (id: string, status: "idle" | "paused") => {
    const previous = team;
    setTeam((current) => current.map((agent) => (agent._id === id ? { ...agent, status } : agent)));
    try {
      const updated = await api.updateAgentStatus(id, status);
      setTeam((current) => current.map((agent) => (agent._id === id ? updated : agent)));
    } catch {
      setTeam(previous);
    }
  };

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="flex-1 ml-[90px] p-8 max-w-[1200px] animate-in fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-black mb-2">Agents</h1>
            <p className="text-[15px] font-medium text-zinc-500">Choose which hired agents are active and available for campaign work.</p>
          </div>
          
          <div className="flex gap-3">
            <Link href="/recruit" className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#F9734F] text-white text-[13px] font-bold shadow-[0_10px_22px_rgba(249,115,79,0.22)] hover:bg-[#EF6542] transition-colors">
              <Users className="w-4 h-4" /> Hire More Agents
            </Link>
          </div>
        </div>        {/* Management Guide */}
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-zinc-800" />
            <h2 className="text-lg font-bold tracking-tight text-black">Team Management Guide</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { title: "Active Status", desc: "Only active agents can be selected for campaign generation tasks." },
              { title: "Performance Monitoring", desc: "Track task completion and performance scores to optimize your team." },
              { title: "Model Capability", desc: "Different agents use different AI models suited for specific marketing tasks." }
            ].map((step, idx) => (
              <div key={idx} className="rounded-xl bg-zinc-50 p-4 border border-zinc-100">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-zinc-400">Tip {idx + 1}</span>
                <h3 className="font-bold text-black">{step.title}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team List */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
             <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search team..." 
                className="pl-10 pr-4 py-2 rounded-[10px] border border-zinc-200 text-[13px] font-semibold w-72 focus:outline-none focus:border-zinc-300 bg-white shadow-sm"
              />
            </div>
            <button className="p-2 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-zinc-100 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-white text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Agent Name</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Performance</th>
                <th className="px-6 py-4 font-semibold">Tasks Completed</th>
                <th className="px-6 py-4 font-semibold text-right">Availability</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-zinc-400 font-medium">Loading team...</td></tr>
              ) : team.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <BrainCircuit className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-black mb-1">Your team is empty</h3>
                    <p className="text-sm text-zinc-500 mb-6">You have not hired any AI agents yet.</p>
                    <Link href="/recruit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#FFCC00] text-black text-[13px] font-bold hover:bg-[#F2C200] shadow-sm transition-colors">
                      <Users className="w-4 h-4" /> Go to Recruit Directory
                    </Link>
                  </td>
                </tr>
              ) : team.map((agent) => (
                <tr key={agent._id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-lg shadow-sm">
                        {agent.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-black text-[14px]">{agent.name}</div>
                        <div className="text-[12px] font-medium text-zinc-400 flex items-center gap-1 mt-0.5">
                          <BrainCircuit className="w-3 h-3" /> {agent.model}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[12px] font-semibold">
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${agent.status === 'working' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                      <span className="text-[13px] font-semibold text-zinc-600 capitalize">{agent.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${agent.performanceScore}%` }} />
                      </div>
                      <span className="text-[13px] font-bold text-black">{agent.performanceScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-zinc-600 font-semibold text-[13px]">
                      <Activity className="w-4 h-4 text-zinc-400" /> {agent.tasksCompleted}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => updateStatus(agent._id, agent.status === "paused" ? "idle" : "paused")}
                      className={`inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-bold transition-colors ${
                        agent.status === "paused"
                          ? "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {agent.status === "paused" ? "Activate" : "Active"}
                    </button>
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
