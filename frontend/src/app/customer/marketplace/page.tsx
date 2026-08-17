"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/format";

type Listing = {
  id: string;
  farmerId: string;
  farmerName: string;
  title: string;
  description?: string;
  category: string;
  price: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  location?: string;
  variety?: string;
  farmingMethod?: string;
};

type Page = {
  content: Listing[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  first: boolean;
  last: boolean;
};

export default function CustomerMarketplacePage() {
  const [page, setPage] = useState<Page | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback((pageNo: number, sort: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pageNo), size: "12" });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    api
      .get<Page>(`/api/customer/produce?${params.toString()}`)
      .then(setPage)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => {
    load(0, "");
    api
      .get<string[]>("/api/customer/categories")
      .then(setCategories)
      .catch(() => undefined);
  }, [load]);

  async function addToCart(listing: Listing) {
    try {
      await api.post(`/api/customer/cart?listingId=${listing.id}&quantity=1`);
      setNotice(`Added ${listing.title} to cart`);
      setTimeout(() => setNotice(null), 2500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add to cart");
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Fresh produce from local farmers" />
      {notice && (
        <div className="mb-4 rounded-xl border border-brand/30 bg-brand-light px-4 py-2.5 text-sm font-medium text-brand-dark">
          ✓ {notice}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(0, "")}
          placeholder="Search produce..."
          className="min-w-52 flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            load(0, "");
          }}
          className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          onClick={() => load(0, "")}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Search
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : !page || page.content.length === 0 ? (
        <EmptyState icon="🥬" title="No produce found" hint="Try a different search or category." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {page.content.map((l) => (
              <div key={l.id} className="ks-shadow flex flex-col rounded-2xl border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-ink">{l.title}</h3>
                  {l.variety && <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-muted">{l.variety}</span>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {l.farmerName} {l.location && `· ${l.location}`}
                </p>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{l.description}</p>
                {l.farmingMethod && (
                  <span className="mt-2 inline-block w-fit rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-medium text-yellow-800">
                    🌱 {l.farmingMethod}
                  </span>
                )}
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-lg font-bold text-brand-dark">
                    {formatINR(l.price)}
                    <span className="text-xs font-medium text-muted">/{l.unit}</span>
                  </p>
                  <p className="text-xs text-muted">{l.quantity} {l.unit} left</p>
                </div>
                <button
                  onClick={() => addToCart(l)}
                  className="mt-3 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
          {page.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={page.first}
                onClick={() => load(page.page - 1, "")}
                className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-sm text-muted">
                Page {page.page + 1} of {page.totalPages}
              </span>
              <button
                disabled={page.last}
                onClick={() => load(page.page + 1, "")}
                className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}