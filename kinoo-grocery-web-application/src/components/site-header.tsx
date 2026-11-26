"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useKinoo } from "@/components/cart-provider";
import {
  NAV_CATEGORIES,
  STORE,
  formatTaka,
  type ProductDto,
} from "@/lib/kinoo";

export function SiteHeader() {
  const router = useRouter();
  const { cart, area, setArea, openCart, addItem } = useKinoo();
  const [term, setTerm] = useState("");
  const [suggestions, setSuggestions] = useState<ProductDto[]>([]);
  const [searching, setSearching] = useState(false);
  const [focused, setFocused] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(query)}&limit=6`,
          { signal: controller.signal, cache: "no-store" },
        );
        const data = (await response.json()) as { ok: boolean; products: ProductDto[] };
        if (data.ok) setSuggestions(data.products);
      } catch {
        /* aborted or offline */
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setAreaOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setFocused(false);
    const query = term.trim();
    router.push(query ? `/?q=${encodeURIComponent(query)}#shop` : "/#shop");
  };

  const showPop = focused && term.trim().length >= 2;

  return (
    <header className="site-header">
      <div className="topbar">
        <div className="k-container">
          <div className="topbar-list">
            <span className="topbar-item">
              <span className="live-dot" />
              Delivering across Dhaka in 60–90 minutes
            </span>
            <span className="topbar-item hide-sm">
              <i className="bi bi-truck" aria-hidden="true" />
              Free delivery over {formatTaka(STORE.freeDeliveryThreshold)}
            </span>
          </div>
          <div className="topbar-list">
            <a className="topbar-item hide-sm" href={`tel:${STORE.hotline.replace(/\s/g, "")}`}>
              <i className="bi bi-headset" aria-hidden="true" />
              {STORE.hotline}
            </a>
            <span className="topbar-item hide-sm">
              <i className="bi bi-shield-check" aria-hidden="true" />
              100% fresh guarantee
            </span>
            <Link className="topbar-item topbar-admin-pill" href="/admin">
              <i className="bi bi-grid-1x2-fill" aria-hidden="true" />
              Admin Studio
            </Link>
          </div>
        </div>
      </div>

      <div className="k-container">
        <div className="header-main">
          <Link className="brand" href="/" aria-label="Kinoo home">
            <span className="brand-mark">
              <i className="bi bi-basket2-fill" aria-hidden="true" />
            </span>
            <span className="brand-text">
              <span className="brand-name">
                Kin<span>oo</span>
              </span>
              <span className="brand-sub">Bazar fresh · everyday</span>
            </span>
          </Link>

          <div className="header-search">
            <form className="search-shell" onSubmit={submitSearch} role="search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search rice, ilish, milk, onion…"
                aria-label="Search groceries"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 140)}
                autoComplete="off"
              />
              <button className="search-btn" type="submit">
                <i className="bi bi-arrow-right-short" aria-hidden="true" />
                <span>Search</span>
              </button>
            </form>

            {showPop && (
              <div className="search-pop">
                <div className="sp-head">
                  <span>{searching ? "Searching the aisles…" : "Live results"}</span>
                  <span>{suggestions.length} items</span>
                </div>
                {suggestions.length === 0 && !searching && (
                  <div className="sp-empty">
                    No groceries matched “{term.trim()}”. Try “rice”, “milk” or “ilish”.
                  </div>
                )}
                {suggestions.map((product) => (
                  <button
                    type="button"
                    className="sp-item"
                    key={product.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      void addItem(product.id, product.name);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.imageUrl} alt="" loading="lazy" />
                    <span>
                      <span className="sp-name">{product.name}</span>
                      <span className="sp-meta">
                        {product.coName} · {product.unit}
                      </span>
                    </span>
                    <span className="sp-price">{formatTaka(product.price)}</span>
                    <i className="bi bi-plus-circle-fill" style={{ color: "#16a34a" }} aria-hidden="true" />
                  </button>
                ))}
                {suggestions.length > 0 && (
                  <button
                    type="button"
                    className="sp-item"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={submitSearch}
                  >
                    <span className="sp-name">View all results for “{term.trim()}”</span>
                    <i className="bi bi-arrow-right" style={{ marginLeft: "auto" }} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="header-actions">
            <div className="area-select" ref={areaRef}>
              <button
                type="button"
                className="area-btn"
                onClick={() => setAreaOpen((value) => !value)}
                aria-expanded={areaOpen}
                aria-haspopup="true"
              >
                <i className="bi bi-geo-alt-fill" aria-hidden="true" />
                {area}
                <i className="bi bi-chevron-down" style={{ fontSize: ".62rem" }} aria-hidden="true" />
              </button>
              {areaOpen && (
                <div className="area-menu">
                  <div className="area-menu-head">Deliver to (Dhaka)</div>
                  {STORE.areas.map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => {
                        setArea(option);
                        setAreaOpen(false);
                      }}
                    >
                      {option}
                      {option === area && <i className="bi bi-check2" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="cart-btn" onClick={openCart} aria-label="Open cart">
              <span className="cb-icon">
                <i className="bi bi-bag-check" aria-hidden="true" />
                {cart.count > 0 && <span className="cb-count">{cart.count}</span>}
              </span>
              <span className="cb-text">
                <small>My bag</small>
                <strong>{formatTaka(cart.subtotal)}</strong>
              </span>
            </button>
          </div>
        </div>

        <nav className="cat-strip" aria-label="Grocery categories">
          <Link href="/#shop">
            <i className="bi bi-grid-3x3-gap-fill" aria-hidden="true" />
            All groceries
          </Link>
          {NAV_CATEGORIES.map((category) => (
            <Link key={category.slug} href={`/?category=${category.slug}#shop`}>
              <span aria-hidden="true">{category.icon}</span>
              {category.name}
            </Link>
          ))}
          <Link className="deals-link" href="/#deals">
            <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
            Today&apos;s deals
          </Link>
        </nav>
      </div>
    </header>
  );
}
