"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { roleHome } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/api";

const ROLES = [
  { value: "farmer", label: "Farmer", icon: "🧑‍🌾" },
  { value: "merchant", label: "Merchant", icon: "🏬" },
  { value: "customer", label: "Customer", icon: "🛍️" },
  { value: "logistics", label: "Logistics", icon: "🚚" },
];

function AuthForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { supabase, user } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(
    search.get("tab") === "signup" ? "signup" : "login",
  );
  const [role, setRole] = useState("farmer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;

    const home = roleHome(user.roles?.[0] ?? "farmer");
    router.replace(home);
  }, [user, router]);

  if (user) {
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (!supabase) {
        setError(
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env.local.",
        );
        return;
      }
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("No session returned");
        const me = await api.get<{ id: string; roles: string[] }>("/api/auth/me");
        router.replace(roleHome(me.roles?.[0] ?? "farmer"));
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, role } },
        });
        if (error) throw error;
        setError(
          "Account created! Check your inbox to confirm your email, then sign in. If email confirmation is disabled in Supabase, sign in directly.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <div className="flex min-h-screen bg-surface">
      <div className="hidden flex-1 flex-col justify-between bg-brand-light p-10 lg:flex">
        <Logo />
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight text-ink">
            Farm to table, <span className="text-brand">simplified.</span>
          </h1>
          <p className="mt-4 max-w-md text-muted">
            Sell, buy and deliver fresh produce on one platform built for Indian
            agriculture.
          </p>
        </div>
        <p className="text-sm text-muted">
          Demo accounts: farmer.ramesh@kisansetu.demo / farmer123 (also
          merchant., customer., logistics. prefixed demo logins)
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <div className="ks-shadow rounded-2xl border border-line bg-white p-6">
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                    tab === t ? "bg-white text-brand-dark ks-shadow" : "text-muted"
                  }`}
                >
                  {t === "login" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {tab === "signup" && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold text-muted uppercase">I am a...</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        role === r.value
                          ? "border-brand bg-brand-light text-brand-dark"
                          : "border-line bg-white text-muted hover:bg-surface"
                      }`}
                    >
                      <span className="mr-1.5">{r.icon}</span>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {tab === "signup" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">Full name</label>
                  <input
                    className={input}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Patil"
                    required
                  />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Email</label>
                <input
                  className={input}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Password</label>
                <input
                  className={input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {busy ? "Please wait..." : tab === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <AuthForm />
    </Suspense>
  );
}