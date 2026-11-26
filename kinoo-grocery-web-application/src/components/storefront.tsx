"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Hero } from "@/components/hero";
import { useKinoo } from "@/components/cart-provider";
import {
  NAV_CATEGORIES,
  STORE,
  discountPercent,
  formatTaka,
  type CategoryDto,
  type ProductDto,
} from "@/lib/kinoo";

type Props = {
  categories: CategoryDto[];
  initialProducts: ProductDto[];
  deals: ProductDto[];
};

export function Storefront({ categories, initialProducts, deals }: Props) {
  const searchParams = useSearchParams();
  const { addItem } = useKinoo();

  const urlQuery = searchParams.get("q") ?? "";
  const urlCategory = searchParams.get("category") ?? "all";

  const [category, setCategory] = useState(urlCategory);
  const [query, setQuery] = useState(urlQuery);
  const [sort, setSort] = useState("featured");
  const [items, setItems] = useState<ProductDto[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [searchDraft, setSearchDraft] = useState(urlQuery);
  const firstRun = useRef(true);

  useEffect(() => {
    setCategory(urlCategory);
  }, [urlCategory]);

  useEffect(() => {
    setQuery(urlQuery);
    setSearchDraft(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const trimmed = query.trim();
    if (firstRun.current && category === "all" && !trimmed && sort === "featured") {
      firstRun.current = false;
      return;
    }
    firstRun.current = false;

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        if (trimmed) params.set("q", trimmed);
        if (sort !== "featured") params.set("sort", sort);

        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as { ok: boolean; products: ProductDto[] };
        if (data.ok) setItems(data.products);
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 170);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [category, query, sort]);

  const updateUrl = useCallback((nextCategory: string, nextQuery: string) => {
    const url = new URL(window.location.href);
    if (nextCategory === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", nextCategory);
    if (nextQuery.trim()) url.searchParams.set("q", nextQuery.trim());
    else url.searchParams.delete("q");
    url.hash = "shop";
    window.history.replaceState(null, "", url.toString());
  }, []);

  const selectCategory = (slug: string) => {
    setCategory(slug);
    updateUrl(slug, query);
    window.setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  };

  const submitInlineSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setQuery(searchDraft);
    updateUrl(category, searchDraft);
  };

  const activeCategory = categories.find((entry) => entry.slug === category);
  const showingDealsRow = category === "all" && !query.trim();
  const heading = query.trim()
    ? `Results for “${query.trim()}”`
    : activeCategory
      ? activeCategory.name
      : "All groceries";
  const subtitle = activeCategory?.blurb ?? "Every aisle of the bazar, weighed fresh today";

  return (
    <div className="k-container">
      <Hero />

      {showingDealsRow && deals.length > 0 && (
        <section className="k-section rise" id="deals">
          <div className="section-head">
            <div>
              <div className="eyebrow deal">
                <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Daily deals
              </div>
              <h2>Today&apos;s bazar deals</h2>
              <p>Discounted prices on the essentials — refreshed every morning at 7 am.</p>
            </div>
            <button type="button" className="link-more" onClick={() => selectCategory("all")}>
              View all groceries
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>

          <div className="deal-strip">
            {deals.slice(0, 10).map((product) => {
              const off = discountPercent(product.price, product.oldPrice);
              return (
                <article className="deal-card" key={product.id}>
                  <div className="dc-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt={product.name} loading="lazy" />
                    {off > 0 && <span className="dc-off">-{off}%</span>}
                  </div>
                  <h4>{product.name}</h4>
                  <div className="deal-unit">{product.unit}</div>
                  <div className="deal-price">
                    <strong>{formatTaka(product.price)}</strong>
                    {product.oldPrice ? <s>{formatTaka(product.oldPrice)}</s> : null}
                  </div>
                  <button
                    type="button"
                    className="add-btn"
                    style={{ justifyContent: "center" }}
                    onClick={() => void addItem(product.id, product.name)}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                    Add to bag
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="k-section" id="shop">
        <div className="shop-layout">
          <aside className="sidebar" aria-label="Filter by category">
            <div className="sidebar-head">
              <span>Shop by aisle</span>
              <i className="bi bi-list-ul" aria-hidden="true" />
            </div>
            <div className="cat-list">
              <button
                type="button"
                className={`cat-item ${category === "all" ? "active" : ""}`}
                onClick={() => selectCategory("all")}
              >
                <span className="ci-icon" aria-hidden="true">
                  🧺
                </span>
                All groceries
                <span className="ci-count">{initialProducts.length}</span>
              </button>
              {categories.map((entry) => (
                <button
                  type="button"
                  key={entry.slug}
                  className={`cat-item ${category === entry.slug ? "active" : ""}`}
                  onClick={() => selectCategory(entry.slug)}
                >
                  <span className="ci-icon" aria-hidden="true">
                    {entry.icon}
                  </span>
                  {entry.name}
                  <span className="ci-count">{entry.count}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-promo">
              <strong>First order? Take 10% off.</strong>
              <p>Use the code below at checkout. Works on your whole bag.</p>
              <span className="promo-code-chip">
                <i className="bi bi-ticket-perforated" aria-hidden="true" />
                {STORE.promoCode}
              </span>
            </div>
          </aside>

          <div>
            <div className="mobile-cats">
              <button
                type="button"
                className={`chip ${category === "all" ? "active" : ""}`}
                onClick={() => selectCategory("all")}
              >
                🧺 All
              </button>
              {NAV_CATEGORIES.map((entry) => (
                <button
                  type="button"
                  key={entry.slug}
                  className={`chip ${category === entry.slug ? "active" : ""}`}
                  onClick={() => selectCategory(entry.slug)}
                >
                  <span aria-hidden="true">{entry.icon}</span>
                  {entry.name}
                </button>
              ))}
            </div>

            <div className="product-area-head">
              <div>
                <h2>{heading}</h2>
                <div className="result-count">
                  {loading
                    ? "Fetching fresh stock…"
                    : `${items.length} ${items.length === 1 ? "item" : "items"} · ${subtitle}`}
                </div>
              </div>
              <div className="right">
                <form onSubmit={submitInlineSearch} className="search-inline">
                  <input
                    type="search"
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder="Filter this aisle"
                    aria-label="Filter products"
                    style={{
                      border: "1px solid #e6ece6",
                      borderRadius: 9,
                      padding: "7px 10px",
                      fontSize: ".78rem",
                      maxWidth: 150,
                      outline: "none",
                    }}
                  />
                </form>
                <select
                  className="sort-select"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort products"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </div>
            </div>

            {loading && items.length === 0 ? (
              <div className="product-grid">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div className="skeleton-card" key={index}>
                    <div className="sk-img" />
                    <div className="sk-line" style={{ width: "60%", marginBottom: 8 }} />
                    <div className="sk-line" style={{ width: "90%", marginBottom: 8 }} />
                    <div className="sk-line" style={{ width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <div className="es-icon">
                  <i className="bi bi-search" aria-hidden="true" />
                </div>
                <h3>No groceries match that</h3>
                <p>
                  We could not find “{query.trim() || activeCategory?.name}”. Try a shorter search or
                  browse another aisle.
                </p>
                <button
                  type="button"
                  className="btn-green"
                  onClick={() => {
                    setQuery("");
                    setSearchDraft("");
                    selectCategory("all");
                  }}
                >
                  Clear filters
                  <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="product-grid" aria-busy={loading}>
                {items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            <div className="sidebar-promo" style={{ marginTop: 18 }}>
              <strong>
                <i className="bi bi-basket2" aria-hidden="true" /> Can&apos;t find something?
              </strong>
              <p>
                Tell our bazar team at {STORE.hotline} and we&apos;ll add it to your next delivery.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
