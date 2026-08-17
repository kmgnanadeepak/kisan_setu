"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { api, setToken } from "./api";
import type { MeResponse } from "./types";

export type AuthState = {
  supabase: SupabaseClient | null;
  user: MeResponse | null;
  loading: boolean;
  ready: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function makeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project")) return null;
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState<SupabaseClient | null>(() => makeClient());
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const refreshUser = useCallback(async (token: string) => {
    setToken(token);
    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      setUser(me);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) {
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const token = data.session?.access_token ?? null;
      if (token) {
        setLoading(true);
        await refreshUser(token);
        setLoading(false);
      }
      supabase.auth.onAuthStateChange((_event, session) => {
        const t = session?.access_token ?? null;
        if (t) {
          setLoading(true);
          refreshUser(t).finally(() => setLoading(false));
        } else {
          setToken(null);
          setUser(null);
        }
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, refreshUser]);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    if (supabase) await supabase.auth.signOut();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ supabase, user, loading, ready, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}