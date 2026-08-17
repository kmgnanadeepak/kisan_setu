"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, EmptyState } from "@/components/ui";

type Merchant = {
  merchantId: string;
  fullName: string;
  city: string;
  state: string;
  avatarUrl?: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  itemCount: number;
  categories: string[];
};

export default function FarmerMarketplacePage() {
  const [merchants, setMerchants] = useState<Merchant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState<number>(20);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (radius) params.set("radiusKm", radius.toString());
    
    const queryString = params.toString();
    const url = `/api/merchant/marketplace/nearby${queryString ? '?' + queryString : ''}`;
    
    api
      .get<Merchant[]>(url)
      .then((data) => setMerchants(data))
      .catch((e) => {
        console.error('Error loading merchants:', e);
        setError(e instanceof Error ? e.message : 'Failed to load merchants');
      })
      .finally(() => setLoading(false));
  }, [search, radius]);

  useEffect(() => {
    load();
  }, [load]);

  const formatDistance = (distance: number | null | undefined) => {
    if (distance == null) return "Location unknown";
    return `${distance.toFixed(1)} km away`;
  };

  const formatLocation = (city: string, state: string) => {
    if (city && state) return `${city}, ${state}`;
    if (city) return city;
    if (state) return state;
    return "Location unknown";
  };

  if (error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-red-600 font-semibold">Error loading marketplace</p>
      <p className="text-red-500 text-sm mt-1">{error}</p>
      <button 
        onClick={load}
        className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="Find agricultural suppliers near you"
        action={
          <a
            href="/farmer/merchant-orders"
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            My orders
          </a>
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className="w-64 rounded-xl border border-line bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          placeholder="Search merchants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
        >
          <option value={10}>Within 10 km</option>
          <option value={20}>Within 20 km</option>
          <option value={50}>Within 50 km</option>
          <option value={100}>Within 100 km</option>
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading nearby merchants..." />
      ) : merchants === null ? (
        <Spinner label="Loading marketplace..." />
      ) : merchants.length === 0 ? (
        <EmptyState 
          icon="🏪" 
          title="No merchants found within your selected radius" 
          hint={
            <div className="flex flex-col gap-2">
              <p>Try increasing your search radius or check your location settings.</p>
              <button
                onClick={() => setRadius(50)}
                className="text-brand hover:underline"
              >
                Try 50 km radius
              </button>
            </div>
          } 
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {merchants.map((merchant) => (
            <div key={merchant.merchantId} className="ks-shadow flex flex-col rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-ink text-lg">{merchant.fullName}</h3>
                  <p className="text-sm text-muted mt-1">
                    📍 {formatLocation(merchant.city, merchant.state)}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    📏 {formatDistance(merchant.distanceKm)}
                  </p>
                </div>
                {merchant.avatarUrl && (
                  <img 
                    src={merchant.avatarUrl} 
                    alt={merchant.fullName} 
                    className="h-12 w-12 rounded-full object-cover border border-line"
                  />
                )}
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <p className="text-sm font-medium text-ink">
                  {merchant.itemCount} products available
                </p>
                {merchant.categories.length > 0 && (
                  <p className="mt-2 text-sm text-muted">
                    {merchant.categories.slice(0, 3).join(" · ")}
                    {merchant.categories.length > 3 && " · ..."}
                  </p>
                )}
              </div>

              <a
                href={`/farmer/marketplace/merchant/${merchant.merchantId}`}
                className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark text-center"
              >
                View Store
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}