"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/api";
import { normalizeUser, storeToken, type SessionUser } from "../../lib/session";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
  initialMode?: "login" | "register";
}

export function AuthModal({ open, onClose, onSuccess, initialMode = "login" }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setIsLogin(initialMode === "login");
      setError("");
    }
  }, [initialMode, open]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      storeToken(res.token);

      const user = normalizeUser(res);
      if (!user) {
        throw new Error("Could not load your account");
      }

      if (!user.onboardingCompleted) {
        onClose();
        window.location.href = "/onboarding";
        return;
      }

      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/60 backdrop-blur-xl"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-white rounded-[48px] w-full max-w-xl overflow-hidden shadow-2xl p-12 relative border border-slate-100"
        >
          <button onClick={onClose} className="absolute top-8 right-8 p-3 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-90">
            <X size={20} />
          </button>

          <div className="text-center mb-10">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Sparkles className="text-white" size={24} />
            </div>
            <h2 className="text-4xl font-bold tracking-tight mb-3 text-slate-900">
              {isLogin ? "Welcome back." : "Start your journey."}
            </h2>
            <p className="text-slate-400 font-medium">Ready to build the future of your business?</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Your Name"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-300 transition-colors font-medium"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-300 transition-colors font-medium"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-slate-300 transition-colors font-medium"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full h-16 text-lg font-bold shadow-xl shadow-orange-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? "Sign In" : "Create Account"
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setError("");
                setIsLogin(!isLogin);
              }}
              className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
            >
              {isLogin ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
