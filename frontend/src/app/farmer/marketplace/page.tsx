"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Spinner, EmptyState } from "@/components/ui";
import { formatINR } from "@/lib/format";

type Product = {
  id: string;
  merchantId: string;
  merchantName?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  quantity: number;
  unit: string;
  imageUrl?: string;
  inStock: boolean;
};

export default function FarmerMarketplacePage() {
  const [page, setPage] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [quantity, setQuantity] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCategories = useCallback(() => {
    api
      .get<string[]>("/api/merchant/marketplace/categories")
      .then((cats) => setCategories(cats))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    params.set("page", "0");
    params.set("size", "50");
    api
      .get<{ content: Product[] }>(`/api/merchant/marketplace/products?${params.toString()}`)
      .then((r) => setPage(r.content))
      .catch((e) => setError(e.message));
  }, [search, category]);

  useEffect(() => {
    loadCategories();
    load();
  }, [loadCategories, load]);

  async function order(product: Product) {
    const q = parseInt(quantity[product.id] ?? "");
    if (!q || q <= 0) return;
    setBusyId(product.id);
    try {
      await api.post("/api/merchant/orders", {
        productId: product.id,
        quantity: q,
        notes: "",
      });
      alert(`Order placed for ${q} ${product.unit} of ${product.name}`);
      setQuantity((q) => ({ ...q, [product.id]: "" }));
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to place order");
    } finally {
      setBusyId(null);
    }
  }

  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="Browse seeds, fertilizers, pesticides and equipment from merchants"
        action={
          <a
            href="/farmer/merchant-orders"
            className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            My orders
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          className="w-64 rounded-xl border border-line bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {!page ? (
        <Spinner label="Loading marketplace..." />
      ) : page.length === 0 ? (
        <EmptyState icon="🏪" title="No merchant products available" hint="Try adjusting your search or filters." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {page.map((p) => (
            <div key={p.id} className="ks-shadow flex flex-col rounded-2xl border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-ink">{p.name}</h3>
                {p.imageUrl && (
                  <img src={p.imageUrl} alt={p.name} className="h-12 w-12 rounded-lg object-cover" />
                )}
              </div>
              <p className="text-sm text-muted">
                {p.category || "General"}
              </p>
              {p.merchantName && (
                <p className="mt-1 text-xs text-muted">🏪 {p.merchantName}</p>
              )}
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{p.description || "No description available"}</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xl font-bold text-brand-dark">
                    {formatINR(p.price)}
                    <span className="text-sm font-medium text-muted">/{p.unit}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {p.quantity} {p.unit} available
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-line pt-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={`Qty (${p.unit})`}
                  value={quantity[p.id] ?? ""}
                  onChange={(e) => setQuantity((q) => ({ ...q, [p.id]: e.target.value }))}
                  className="w-24 rounded-lg border border-line px-2 py-2 text-sm focus:border-brand focus:outline-none"
                />
                <button
                  onClick={() => order(p)}
                  disabled={busyId === p.id || !p.inStock}
                  className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busyId === p.id ? "Placing..." : !p.inStock ? "Out of stock" : "Place order"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}