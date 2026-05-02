"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { Wallet, DollarSign, TrendingUp, Search, RefreshCw } from "lucide-react";

export default function OffersPage() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const data = await api.getAgentTeam();
      setTeam(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBudget = async (id: string, value: number) => {
    setSaving(id);
    try {
      await api.updateAgentBudget(id, value);
      await fetchTeam();
    } catch (e) {
      alert("Failed to update budget");
    } finally {
      setSaving(null);
    }
  };

  const totalBudget = team.reduce((acc, curr) => acc + (curr.budgetAllocated || 0), 0);
  const totalSpent = team.reduce((acc, curr) => acc + (curr.budgetSpent || 0), 0);

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="flex-1 ml-[90px] p-8 max-w-[1200px] animate-in fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-black mb-2">Offers & Budgets</h1>
            <p className="text-[15px] font-medium text-zinc-500">Manage compute tokens and ad spend limits for your AI agents.</p>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-zinc-500">
              <Wallet className="w-5 h-5" />
              <span className="text-[14px] font-bold">Total Budget Allocated</span>
            </div>
            <div className="text-[32px] font-black tracking-tight">${totalBudget.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-zinc-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-[14px] font-bold">Total Agent Spend</span>
            </div>
            <div className="text-[32px] font-black tracking-tight">${totalSpent.toFixed(2)}</div>
          </div>
          <div className="bg-[#1A2B24] rounded-2xl border border-transparent p-6 shadow-sm text-white">
            <div className="flex items-center gap-3 mb-4 text-white/70">
              <DollarSign className="w-5 h-5" />
              <span className="text-[14px] font-bold">Available Balance</span>
            </div>
            <div className="text-[32px] font-black tracking-tight text-[#FFCC00]">
              ${Math.max(0, totalBudget - totalSpent).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Budget Table */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-[15px] text-black">Agent Ledger</h3>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search ledger..." 
                className="pl-10 pr-4 py-2 rounded-[10px] border border-zinc-200 text-[13px] font-semibold w-64 focus:outline-none focus:border-zinc-300 bg-white shadow-sm"
              />
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-100 bg-white text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Agent</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Cost per Task</th>
                <th className="px-6 py-4 font-semibold">Spent</th>
                <th className="px-6 py-4 font-semibold w-48 text-right">Allocated Budget ($)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-400 font-medium">Loading ledger...</td></tr>
              ) : team.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-zinc-500 font-medium">No agents hired yet.</td></tr>
              ) : team.map((agent) => (
                <tr key={agent._id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-sm shadow-sm">
                        {agent.avatar}
                      </div>
                      <span className="font-bold text-black text-[14px]">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[13px] font-semibold text-zinc-500">
                    {agent.role}
                  </td>
                  <td className="px-6 py-5 text-[13px] font-bold text-zinc-600">
                    ${agent.costPerTask.toFixed(2)}
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[14px] font-bold text-black">${(agent.budgetSpent || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <input 
                        type="number"
                        defaultValue={agent.budgetAllocated}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== agent.budgetAllocated) {
                            handleUpdateBudget(agent._id, val);
                          }
                        }}
                        className="w-24 px-3 py-2 border border-zinc-200 rounded-lg text-[13px] font-bold text-right focus:outline-none focus:border-zinc-400"
                      />
                      {saving === agent._id ? (
                        <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />
                      ) : (
                        <div className="w-4 h-4" /> // Placeholder for spacing
                      )}
                    </div>
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
