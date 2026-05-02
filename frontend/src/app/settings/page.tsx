"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LogOut, Megaphone, PlugZap, RefreshCw, Shield, Unplug, UserRound } from "lucide-react";

import Sidebar from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { clearSession, normalizeUser, type SessionUser } from "@/lib/session";

type MetaConnection = {
  _id: string;
  name?: string;
  metaUserId?: string;
  tokenStatus?: string;
  syncHealthStatus?: string;
  tokenExpiresAt?: string;
  lastSuccessfulSyncAt?: string;
};

type MetaAdAccount = {
  _id: string;
  connectionId?: string;
  accountId: string;
  name?: string;
  currency?: string;
  accountStatus?: number;
};

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const loadSettings = async () => {
    const [me, connectionData, accountData] = await Promise.all([
      api.getMe(),
      api.getMetaAdsV2Connections(),
      api.getMetaAdsV2AdAccounts(),
    ]);

    setUser(normalizeUser(me));
    setConnections(connectionData.connections || []);
    setAdAccounts(accountData.adAccounts || []);
    setSelectedAccountId(accountData.preference?.selectedAdAccountId || accountData.adAccounts?.[0]?.accountId || "");
    setSelectedConnectionId(accountData.preference?.selectedConnectionId || accountData.adAccounts?.[0]?.connectionId || "");
  };

  useEffect(() => {
    window.setTimeout(() => {
      loadSettings()
        .catch(() => {
          window.location.href = "/";
        })
        .finally(() => setLoading(false));
    }, 0);
  }, []);

  const connectMeta = async () => {
    setError("");
    setBusy("connect");
    try {
      const { url } = await api.getMetaAdsV2OAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Meta connection");
      setBusy("");
    }
  };

  const disconnectMeta = async (connectionId: string) => {
    setError("");
    setBusy(connectionId);
    try {
      await api.disconnectMetaAdsV2Connection(connectionId, "user_disconnected_from_settings");
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect Meta account");
    } finally {
      setBusy("");
    }
  };

  const syncAdAccounts = async () => {
    setError("");
    setBusy("sync");
    try {
      await api.syncMetaAdsV2AdAccounts();
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sync Meta ad accounts");
    } finally {
      setBusy("");
    }
  };

  const selectAdAccount = async () => {
    if (!selectedAccountId) return;
    setError("");
    setBusy("select");
    try {
      await api.selectMetaAdsV2AdAccount(selectedAccountId, selectedConnectionId || undefined);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not select ad account");
    } finally {
      setBusy("");
    }
  };

  const logout = () => {
    clearSession();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen app-bg text-black">
        <Sidebar />
        <main className="ml-[90px] flex flex-1 items-center justify-center p-8">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-100 border-t-black" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen app-bg text-black">
      <Sidebar />
      <main className="ml-[90px] flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-[1180px] animate-in">
          <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">Workspace settings</p>
              <h1 className="text-[34px] font-bold tracking-tight">Account and Meta connection</h1>
              <p className="mt-2 max-w-2xl text-[15px] font-medium text-zinc-500">
                Manage login, connected Meta identity, ad account selection, and disconnect controls.
              </p>
            </div>
            <button onClick={logout} className="btn-secondary">
              <LogOut className="h-4 w-4" />
              Log out of MetaBuddy
            </button>
          </header>

          {error && (
            <div className="mb-6 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="mb-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100">
                <UserRound className="h-6 w-6 text-zinc-700" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">{user?.name || "User"}</h2>
              <p className="mt-1 text-sm font-semibold text-zinc-500">{user?.email}</p>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Company</p>
                  <p className="mt-1 font-bold">{user?.company || "Not set"}</p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Onboarding</p>
                  <p className="mt-1 font-bold">{user?.onboardingCompleted ? "Completed" : "Incomplete"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-zinc-700" />
                    <h2 className="text-xl font-bold tracking-tight">Meta Ads connection</h2>
                  </div>
                  <p className="text-sm font-medium text-zinc-500">
                    Disconnect here when you want to remove the connected Facebook/Instagram Ads account from this workspace.
                    This does not log you out of facebook.com in the browser; it revokes this workspace connection.
                  </p>
                </div>
                <button onClick={connectMeta} disabled={busy === "connect"} className="btn-primary shrink-0">
                  <PlugZap className="h-4 w-4" />
                  {busy === "connect" ? "Opening" : connections.length ? "Connect another" : "Connect Meta"}
                </button>
              </div>

              {connections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center">
                  <Shield className="mx-auto mb-3 h-9 w-9 text-zinc-300" />
                  <h3 className="font-bold">No Meta account connected</h3>
                  <p className="mt-1 text-sm font-medium text-zinc-500">Connect Meta to sync real campaigns and allow agents to create paused ads.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map((connection) => (
                    <div key={connection._id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <p className="font-bold text-black">{connection.name || "Connected Meta account"}</p>
                          </div>
                          <p className="text-xs font-semibold text-zinc-500">
                            Meta ID {connection.metaUserId || "unknown"} · Token {connection.tokenStatus || "unknown"} · Sync {connection.syncHealthStatus || "unknown"}
                          </p>
                        </div>
                        <button
                          onClick={() => disconnectMeta(connection._id)}
                          disabled={busy === connection._id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-100 bg-white px-4 text-sm font-bold text-red-600 disabled:opacity-50"
                        >
                          <Unplug className="h-4 w-4" />
                          {busy === connection._id ? "Disconnecting" : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur lift-hover p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Ad account selection</h2>
                <p className="mt-1 text-sm font-medium text-zinc-500">Choose which Meta ad account this workspace should sync and control.</p>
              </div>
              <button onClick={syncAdAccounts} disabled={busy === "sync" || connections.length === 0} className="btn-secondary">
                <RefreshCw className={`h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />
                Sync ad accounts
              </button>
            </div>

            {adAccounts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center text-sm font-semibold text-zinc-500">
                No ad accounts found yet. Connect Meta or sync ad accounts.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={selectedAccountId}
                  onChange={(event) => {
                    const account = adAccounts.find((item) => item.accountId === event.target.value);
                    setSelectedAccountId(event.target.value);
                    setSelectedConnectionId(account?.connectionId || "");
                  }}
                  className="h-12 rounded-lg border border-zinc-200 bg-white/90 shadow-sm backdrop-blur px-3 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
                >
                  {adAccounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {account.name || account.accountId} · {account.accountId}
                    </option>
                  ))}
                </select>
                <button onClick={selectAdAccount} disabled={busy === "select"} className="btn-primary">
                  Save selected account
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
