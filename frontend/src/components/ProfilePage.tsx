"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/types";
import { PageHeader, Spinner } from "@/components/ui";

export function ProfilePage({ role }: { role: string }) {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<number>(0);

  useEffect(() => {
    api
      .get<{ count: number }>("/api/notifications/unread-count")
      .then((r) => setNotifications(r.count))
      .catch(() => undefined);
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!user) return <Spinner label="Loading profile..." />;

  const p = user.profile;

  const rows: Array<[string, string | undefined]> = [
    ["Full name", p?.fullName],
    ["Email", user.email],
    ["Phone", p?.phone],
    ["Address", p?.address],
    ["City", p?.city],
    ["State", p?.state],
    ["Pincode", p?.pincode],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Profile" subtitle={`${roleLabel(role)} account`} />
      <div className="ks-shadow rounded-2xl border border-line bg-white p-6">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
            {(p?.fullName ?? "U").charAt(0)}
          </span>
          <div>
            <p className="text-xl font-bold text-ink">{p?.fullName ?? "—"}</p>
            <p className="text-sm text-muted">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-brand-light px-3 py-0.5 text-xs font-semibold text-brand-dark">
              {(user.roles ?? []).map((r) => roleLabel(r)).join(", ") || "User"}
            </span>
          </div>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-muted uppercase">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{value || "—"}</dd>
            </div>
          ))}
        </dl>
        {p?.latitude != null && (
          <p className="mt-5 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
            📍 Location: {p.latitude.toFixed(4)}, {p.longitude?.toFixed(4)}
          </p>
        )}
        <p className="mt-3 text-xs text-muted">
          Profile details are managed by your Supabase account and seed data.
        </p>
      </div>
    </div>
  );
}