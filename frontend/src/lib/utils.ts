import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  if (value >= 100000) return (value / 100000).toFixed(1) + 'L';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    case 'predicted': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'active': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'completed': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'analyzed': return 'bg-green-500/20 text-green-400 border-green-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'exceeded': return 'text-green-400';
    case 'met': return 'text-blue-400';
    case 'missed': return 'text-red-400';
    default: return 'text-slate-400';
  }
}
