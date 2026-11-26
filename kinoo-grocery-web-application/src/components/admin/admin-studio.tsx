"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OrderDrawer } from "@/components/admin/order-drawer";
import { ProductModal } from "@/components/admin/product-modal";
import { RevenueChart } from "@/components/admin/revenue-chart";
import {
  DHAKA_RIDERS,
  ORDER_STATUSES,
  type AdminCategoryDto,
  type AdminDashboardDto,
  type AdminOrderDto,
  type AdminProductDto,
  type AdminPromoDto,
} from "@/lib/admin-types";
import { discountPercent, formatTaka } from "@/lib/kinoo";

type TabId =
  | "overview"
  | "orders"
  | "products"
  | "categories"
  | "promos"
  | "customers"
  | "settings";

const NAV_ITEMS: { id: TabId; label: string; icon: string; section: string }[] = [
  { id: "overview", label: "Executive Overview", icon: "bi-grid-1x2-fill", section: "Command" },
  { id: "orders", label: "Orders & Dispatch", icon: "bi-receipt-cutoff", section: "Command" },
  { id: "products", label: "Catalog & Inventory", icon: "bi-box-seam-fill", section: "Bazar" },
  { id: "categories", label: "Store Aisles", icon: "bi-layers-fill", section: "Bazar" },
  { id: "promos", label: "Promos & Deals", icon: "bi-ticket-perforated-fill", section: "Growth" },
  { id: "customers", label: "Customers CRM", icon: "bi-people-fill", section: "Growth" },
  { id: "settings", label: "Store Settings", icon: "bi-sliders2", section: "System" },
];

const dhakaDate = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dhaka",
});

function relativeTime(iso: string): string {
  const diffMin = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60_000), 0);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hrs = Math.round(diffMin / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function AdminStudio({ initialData }: { initialData: AdminDashboardDto }) {
  const [data, setData] = useState<AdminDashboardDto>(initialData);
  const [tab, setTab] = useState<TabId>("overview");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("kinoo_admin_theme") === "dark";
    } catch {
      return false;
    }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const toastSeq = useRef(0);

  // Orders tab state
  const [orderView, setOrderView] = useState<"table" | "kanban">("table");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderAreaFilter, setOrderAreaFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDto | null>(null);

  // Products tab state
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("all");
  const [prodStockFilter, setProdStockFilter] = useState<"all" | "low" | "out" | "deals">("all");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductDto | null>(null);

  // Category form state
  const [catForm, setCatForm] = useState<{
    id?: number;
    name: string;
    blurb: string;
    icon: string;
  }>({ name: "", blurb: "", icon: "🥬" });
  const [catModalOpen, setCatModalOpen] = useState(false);

  // Promo form state
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "",
    title: "",
    discountType: "percent",
    discountValue: "10",
    minOrder: "500",
    maxDiscount: "300",
  });

  // Customer search
  const [customerSearch, setCustomerSearch] = useState("");

  // Settings form state
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>(initialData.settings);
  const [savingSettings, setSavingSettings] = useState(false);

  const notify = useCallback((msg: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((curr) => [...curr.slice(-2), { id, msg }]);
    window.setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const toggleTheme = () => {
    setDarkMode((curr) => {
      const next = !curr;
      try {
        window.localStorage.setItem("kinoo_admin_theme", next ? "dark" : "light");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const refreshDashboard = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/admin/overview", { cache: "no-store" });
        const json = (await res.json()) as { ok: boolean; dashboard?: AdminDashboardDto };
        if (json.ok && json.dashboard) {
          setData(json.dashboard);
          setSettingsDraft(json.dashboard.settings);
          if (!silent) notify("Synced live store metrics");
        }
      } catch {
        if (!silent) notify("Could not sync dashboard");
      } finally {
        setRefreshing(false);
      }
    },
    [notify],
  );

  // Order mutation
  const handleUpdateOrder = async (patch: {
    id: number;
    status?: string;
    riderName?: string;
    adminNote?: string;
  }) => {
    const res = await fetch("/api/admin/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as {
      ok: boolean;
      order?: AdminOrderDto | null;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Failed to update order");
      return;
    }
    notify(`Order ${json.order?.orderNumber ?? ""} updated`);
    if (selectedOrder && json.order && selectedOrder.id === json.order.id) {
      setSelectedOrder(json.order);
    }
    await refreshDashboard(true);
  };

  // Product create / update
  const handleSaveProduct = async (payload: {
    id?: number;
    name: string;
    coName: string;
    categorySlug: string;
    unit: string;
    price: number;
    oldPrice: number | null;
    imageUrl: string;
    description: string;
    badge: string | null;
    rating: number;
    stockQty: number;
    inStock: boolean;
    isDeal: boolean;
  }) => {
    const isEdit = Boolean(payload.id);
    const res = await fetch("/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Could not save product");
      return;
    }
    notify(isEdit ? `Updated "${payload.name}"` : `Added "${payload.name}" to catalog`);
    await refreshDashboard(true);
  };

  const handleQuickPatchProduct = async (
    id: number,
    patch: Partial<{ inStock: boolean; isDeal: boolean; stockQty: number; price: number }>,
    msg: string,
  ) => {
    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Update failed");
      return;
    }
    notify(msg);
    await refreshDashboard(true);
  };

  const handleDeleteProduct = async (product: AdminProductDto) => {
    const res = await fetch(`/api/admin/products?id=${product.id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Could not delete product");
      return;
    }
    notify(`Removed "${product.name}"`);
    await refreshDashboard(true);
  };

  // Category create / edit / delete
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (catForm.name.trim().length < 2) return;
    const isEdit = Boolean(catForm.id);
    const res = await fetch("/api/admin/categories", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Could not save aisle");
      return;
    }
    setCatModalOpen(false);
    notify(isEdit ? `Updated aisle "${catForm.name}"` : `Created aisle "${catForm.name}"`);
    await refreshDashboard(true);
  };

  const handleDeleteCategory = async (cat: AdminCategoryDto) => {
    const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Cannot delete aisle");
      return;
    }
    notify(`Removed aisle "${cat.name}"`);
    await refreshDashboard(true);
  };

  // Promo create / toggle / delete
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: promoForm.code,
        title: promoForm.title,
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue) || 10,
        minOrder: Number(promoForm.minOrder) || 0,
        maxDiscount: Number(promoForm.maxDiscount) || null,
        active: true,
      }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (!res.ok || !json.ok) {
      notify(json.error ?? "Could not create promo");
      return;
    }
    setPromoModalOpen(false);
    setPromoForm({
      code: "",
      title: "",
      discountType: "percent",
      discountValue: "10",
      minOrder: "500",
      maxDiscount: "300",
    });
    notify(`Campaign ${promoForm.code.toUpperCase()} is now live!`);
    await refreshDashboard(true);
  };

  const handleTogglePromo = async (promo: AdminPromoDto) => {
    const res = await fetch("/api/admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: promo.id, active: !promo.active }),
    });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (res.ok && json.ok) {
      notify(`${promo.code} ${!promo.active ? "activated" : "paused"}`);
      await refreshDashboard(true);
    }
  };

  const handleDeletePromo = async (promo: AdminPromoDto) => {
    const res = await fetch(`/api/admin/promos?id=${promo.id}`, { method: "DELETE" });
    const json = (await res.json()) as { ok: boolean; error?: string };
    if (res.ok && json.ok) {
      notify(`Deleted promo ${promo.code}`);
      await refreshDashboard(true);
    }
  };

  // Settings save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsDraft),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !json.ok) {
        notify(json.error ?? "Could not save settings");
        return;
      }
      notify("Store configuration saved");
      await refreshDashboard(true);
    } finally {
      setSavingSettings(false);
    }
  };

  // CSV Export for Orders
  const exportOrdersCsv = () => {
    const header = [
      "Order Number",
      "Created At",
      "Customer",
      "Phone",
      "Area",
      "Payment",
      "Status",
      "Rider",
      "Subtotal",
      "Discount",
      "Delivery",
      "Total",
    ];
    const lines = data.orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.phone,
        o.area,
        o.paymentMethod,
        o.status,
        `"${o.riderName}"`,
        o.subtotal,
        o.discount,
        o.deliveryFee,
        o.total,
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kinoo-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Exported orders CSV");
  };

  // Derived filtered lists
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return data.orders.filter((o) => {
      if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
      if (orderAreaFilter !== "all" && o.area !== orderAreaFilter) return false;
      if (q) {
        const hay = `${o.orderNumber} ${o.customerName} ${o.phone} ${o.area} ${o.riderName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.orders, orderStatusFilter, orderAreaFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return data.products.filter((p) => {
      if (prodCategory !== "all" && p.categorySlug !== prodCategory) return false;
      if (prodStockFilter === "low" && !(p.inStock && p.stockQty > 0 && p.stockQty <= 15)) {
        return false;
      }
      if (prodStockFilter === "out" && !(!p.inStock || p.stockQty <= 0)) return false;
      if (prodStockFilter === "deals" && !p.isDeal) return false;
      if (q) {
        const hay = `${p.name} ${p.coName} ${p.unit} ${p.categorySlug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.products, prodCategory, prodStockFilter, prodSearch]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter((c) =>
      `${c.name} ${c.phone} ${c.area}`.toLowerCase().includes(q),
    );
  }, [data.customers, customerSearch]);

  const topSellingProducts = useMemo(
    () => [...data.products].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    [data.products],
  );

  const lowStockProducts = useMemo(
    () =>
      data.products
        .filter((p) => p.stockQty <= 15)
        .sort((a, b) => a.stockQty - b.stockQty)
        .slice(0, 6),
    [data.products],
  );

  const storeIsOpen = settingsDraft.storeOpen !== "false";
  const currentNav = NAV_ITEMS.find((n) => n.id === tab) ?? NAV_ITEMS[0]!;

  // Command palette results
  const cmdResults = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    const actions: { label: string; meta: string; icon: string; run: () => void }[] = [
      ...NAV_ITEMS.map((item) => ({
        label: `Go to ${item.label}`,
        meta: item.section,
        icon: item.icon,
        run: () => {
          setTab(item.id);
          setCmdOpen(false);
        },
      })),
      {
        label: "Add New Grocery Product",
        meta: "Action",
        icon: "bi-plus-circle-fill",
        run: () => {
          setTab("products");
          setEditingProduct(null);
          setProductModalOpen(true);
          setCmdOpen(false);
        },
      },
      {
        label: "Create Promo Campaign",
        meta: "Action",
        icon: "bi-ticket-perforated-fill",
        run: () => {
          setTab("promos");
          setPromoModalOpen(true);
          setCmdOpen(false);
        },
      },
      {
        label: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
        meta: "Theme",
        icon: darkMode ? "bi-sun-fill" : "bi-moon-stars-fill",
        run: () => {
          toggleTheme();
          setCmdOpen(false);
        },
      },
      ...data.orders.slice(0, 8).map((o) => ({
        label: `Order ${o.orderNumber} — ${o.customerName}`,
        meta: `${formatTaka(o.total)} · ${o.area}`,
        icon: "bi-receipt",
        run: () => {
          setSelectedOrder(o);
          setCmdOpen(false);
        },
      })),
      ...data.products.slice(0, 12).map((p) => ({
        label: `Edit SKU: ${p.name}`,
        meta: `${formatTaka(p.price)} · Stock ${p.stockQty}`,
        icon: "bi-box-seam",
        run: () => {
          setEditingProduct(p);
          setProductModalOpen(true);
          setCmdOpen(false);
        },
      })),
    ];

    if (!q) return actions.slice(0, 10);
    return actions
      .filter((a) => `${a.label} ${a.meta}`.toLowerCase().includes(q))
      .slice(0, 12);
  }, [cmdQuery, data.orders, data.products, darkMode]);

  return (
    <div className={`adm-root ${darkMode ? "dark" : ""}`}>
      <div
        className={`adm-sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ==================== SIDEBAR ==================== */}
      <aside className={`adm-sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Admin navigation">
        <div className="adm-brand">
          <span className="adm-brand-logo">
            <i className="bi bi-basket2-fill" aria-hidden="true" />
          </span>
          <div>
            <div className="adm-brand-title">
              <div>
                Kin<span>oo</span>
              </div>
              <span className="adm-studio-badge">Studio</span>
            </div>
            <div className="adm-brand-sub">Dhaka Grocery Operations</div>
          </div>
        </div>

        <div className="adm-store-pulse">
          <div className="adm-pulse-left">
            <span className={`adm-pulse-dot ${storeIsOpen ? "" : "closed"}`} />
            <div>
              <div className="adm-pulse-label">
                {storeIsOpen ? "Accepting Orders" : "Store Paused"}
              </div>
              <div className="adm-pulse-sub">
                {settingsDraft.deliveryWindow || "60–90 mins"} · 4 hubs
              </div>
            </div>
          </div>
          <span className="adm-nav-pill live">LIVE</span>
        </div>

        {["Command", "Bazar", "Growth", "System"].map((section) => (
          <div key={section}>
            <div className="adm-nav-group-label">{section}</div>
            <nav className="adm-nav">
              {NAV_ITEMS.filter((item) => item.section === section).map((item) => {
                let badgeNode = null;
                if (item.id === "orders" && data.metrics.activeOrders > 0) {
                  badgeNode = (
                    <span className="adm-nav-pill live">{data.metrics.activeOrders}</span>
                  );
                } else if (item.id === "products" && data.metrics.lowStockCount > 0) {
                  badgeNode = (
                    <span className="adm-nav-pill warn">{data.metrics.lowStockCount} low</span>
                  );
                } else if (item.id === "promos") {
                  const activeCount = data.promos.filter((p) => p.active).length;
                  badgeNode = <span className="adm-nav-pill">{activeCount}</span>;
                } else if (item.id === "customers") {
                  badgeNode = (
                    <span className="adm-nav-pill">{data.metrics.uniqueCustomers}</span>
                  );
                }

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`adm-nav-btn ${tab === item.id ? "active" : ""}`}
                    onClick={() => {
                      setTab(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                    {badgeNode}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}

        <div className="adm-sidebar-foot">
          <Link href="/" className="adm-storefront-link">
            <span>
              <i className="bi bi-shop" style={{ marginRight: 7 }} aria-hidden="true" />
              View Live Storefront
            </span>
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
          </Link>

          <div className="adm-operator">
            <div className="adm-avatar">AR</div>
            <div>
              <div className="adm-op-name">Arafat Rahman</div>
              <div className="adm-op-role">Head of Bazar Ops · Dhaka</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN WORKSPACE ==================== */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <button
              type="button"
              className="adm-burger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <i className="bi bi-list" aria-hidden="true" />
            </button>
            <div className="adm-page-crumb">
              <small>Kinoo Admin · {currentNav.section}</small>
              <strong>{currentNav.label}</strong>
            </div>
          </div>

          <div className="adm-topbar-right">
            <button
              type="button"
              className="adm-cmd-trigger"
              onClick={() => setCmdOpen(true)}
              aria-label="Open quick command search"
            >
              <i className="bi bi-search" aria-hidden="true" />
              <span>Search orders, SKUs, actions…</span>
              <kbd>⌘K</kbd>
            </button>

            <button
              type="button"
              className={`adm-icon-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => void refreshDashboard(false)}
              title="Sync live data"
              aria-label="Sync live data"
            >
              <i className="bi bi-arrow-repeat" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="adm-icon-btn"
              onClick={toggleTheme}
              title={darkMode ? "Light mode" : "Dark mode"}
              aria-label="Toggle color theme"
            >
              <i
                className={`bi ${darkMode ? "bi-sun-fill" : "bi-moon-stars-fill"}`}
                aria-hidden="true"
              />
            </button>

            <button
              type="button"
              className="adm-btn adm-btn-primary"
              onClick={() => {
                setEditingProduct(null);
                setProductModalOpen(true);
              }}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span className="hide-sm">New Product</span>
            </button>
          </div>
        </header>

        <div className="adm-content">
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {tab === "overview" && (
            <>
              <section className="adm-hero-banner">
                <div className="adm-hero-copy">
                  <span className="adm-hero-eyebrow">
                    <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
                    Dhaka Dispatch Command · Live Telemetry
                  </span>
                  <h1>Good day, Arafat — the bazar is humming.</h1>
                  <p>
                    {data.metrics.activeOrders} orders are currently moving through picking and
                    rider dispatch across Dhanmondi, Gulshan, Uttara &amp; Mirpur.
                  </p>
                </div>

                <div className="adm-hero-stats">
                  <div className="adm-hero-chip">
                    <small>Last 24h Sales</small>
                    <strong>{formatTaka(data.metrics.todayRevenue)}</strong>
                  </div>
                  <div className="adm-hero-chip">
                    <small>Active Bags</small>
                    <strong>{data.metrics.activeOrders} in flight</strong>
                  </div>
                  <div className="adm-hero-chip">
                    <small>Fulfillment</small>
                    <strong>{data.metrics.fulfillmentRate}% SLA</strong>
                  </div>
                </div>
              </section>

              {/* KPI Row */}
              <section className="adm-kpi-grid">
                <div className="adm-kpi-card">
                  <div className="adm-kpi-top">
                    <span className="adm-kpi-label">Net Bazar Revenue</span>
                    <span className="adm-kpi-icon emerald">
                      <i className="bi bi-currency-exchange" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="adm-kpi-val">{formatTaka(data.metrics.grossRevenue)}</div>
                  <div className="adm-kpi-foot">
                    <span>Avg bag {formatTaka(data.metrics.avgOrderValue)}</span>
                    <span className="adm-trend up">
                      <i className="bi bi-arrow-up-right" aria-hidden="true" /> +18.4%
                    </span>
                  </div>
                </div>

                <div className="adm-kpi-card">
                  <div className="adm-kpi-top">
                    <span className="adm-kpi-label">Total Orders</span>
                    <span className="adm-kpi-icon blue">
                      <i className="bi bi-bag-check-fill" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="adm-kpi-val">{data.metrics.totalOrders}</div>
                  <div className="adm-kpi-foot">
                    <span>{data.metrics.deliveredOrders} delivered · {data.metrics.activeOrders} active</span>
                    <span className="adm-trend up">Live</span>
                  </div>
                </div>

                <div className="adm-kpi-card">
                  <div className="adm-kpi-top">
                    <span className="adm-kpi-label">Catalog &amp; Stock Health</span>
                    <span className="adm-kpi-icon amber">
                      <i className="bi bi-box-seam-fill" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="adm-kpi-val">{data.metrics.totalProducts} SKUs</div>
                  <div className="adm-kpi-foot">
                    <span>{data.metrics.dealsCount} active daily deals</span>
                    {data.metrics.lowStockCount > 0 ? (
                      <span className="adm-trend warn">
                        {data.metrics.lowStockCount} low stock
                      </span>
                    ) : (
                      <span className="adm-trend up">Healthy</span>
                    )}
                  </div>
                </div>

                <div className="adm-kpi-card">
                  <div className="adm-kpi-top">
                    <span className="adm-kpi-label">Dhaka Households</span>
                    <span className="adm-kpi-icon indigo">
                      <i className="bi bi-people-fill" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="adm-kpi-val">{data.metrics.uniqueCustomers}</div>
                  <div className="adm-kpi-foot">
                    <span>{data.metrics.repeatCustomers} repeat households</span>
                    <span className="adm-trend up">VIPs</span>
                  </div>
                </div>
              </section>

              {/* Revenue Chart + Area & Payment Mix */}
              <div className="adm-grid-2">
                <section className="adm-card">
                  <div className="adm-card-head">
                    <div>
                      <h2>7-Day Revenue Trajectory</h2>
                      <p>Settled &amp; confirmed order volume across Dhaka delivery zones (BDT ৳)</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={exportOrdersCsv}
                    >
                      <i className="bi bi-download" aria-hidden="true" />
                      Export CSV
                    </button>
                  </div>
                  <RevenueChart series={data.revenueSeries} />
                </section>

                <section className="adm-card">
                  <div className="adm-card-head">
                    <div>
                      <h2>Dhaka Zone Performance</h2>
                      <p>Revenue share by neighbourhood hub</p>
                    </div>
                  </div>
                  <div className="adm-bars">
                    {data.areaBreakdown.map((area) => (
                      <div className="adm-bar-row" key={area.area}>
                        <div className="adm-bar-meta">
                          <strong>
                            <i
                              className="bi bi-geo-alt-fill"
                              style={{ color: "var(--adm-emerald)", marginRight: 5 }}
                              aria-hidden="true"
                            />
                            {area.area}
                          </strong>
                          <span>
                            {formatTaka(area.revenue)} · {area.orders} ord ({area.share}%)
                          </span>
                        </div>
                        <div className="adm-bar-track">
                          <div
                            className="adm-bar-fill"
                            style={{ width: `${Math.max(area.share, 4)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 15,
                      borderTop: "1px dashed var(--adm-line)",
                    }}
                  >
                    <h3 style={{ fontSize: "0.84rem", marginBottom: 10 }}>Payment Channel Mix</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {data.paymentBreakdown.map((pm) => (
                        <div
                          key={pm.method}
                          style={{
                            padding: "10px",
                            borderRadius: 12,
                            background: "var(--adm-surface-2)",
                            border: "1px solid var(--adm-line)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              color: "var(--adm-muted)",
                            }}
                          >
                            {pm.method}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "0.95rem", marginTop: 2 }}>
                            {pm.share}%
                          </div>
                          <div style={{ fontSize: "0.69rem", color: "var(--adm-muted)" }}>
                            {formatTaka(pm.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              {/* Recent Orders + Top Sellers / Restock Alerts */}
              <div className="adm-grid-2">
                <section className="adm-card">
                  <div className="adm-card-head">
                    <div>
                      <h2>Live Dispatch Queue</h2>
                      <p>Click any order to inspect bag items, assign a rider or advance status</p>
                    </div>
                    <button
                      type="button"
                      className="adm-btn adm-btn-secondary adm-btn-sm"
                      onClick={() => setTab("orders")}
                    >
                      All {data.orders.length} Orders
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Area</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Placed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.orders.slice(0, 6).map((order) => {
                          const st =
                            ORDER_STATUSES.find((s) => s.value === order.status) ??
                            ORDER_STATUSES[0];
                          return (
                            <tr
                              key={order.id}
                              style={{ cursor: "pointer" }}
                              onClick={() => setSelectedOrder(order)}
                            >
                              <td>
                                <strong style={{ color: "var(--adm-emerald)" }}>
                                  {order.orderNumber}
                                </strong>
                                <div className="adm-prod-sub">
                                  {order.items.reduce((s, i) => s + i.quantity, 0)} items ·{" "}
                                  {order.paymentMethod.toUpperCase()}
                                </div>
                              </td>
                              <td>
                                <div className="adm-prod-title">{order.customerName}</div>
                                <div className="adm-prod-sub">{order.phone}</div>
                              </td>
                              <td>{order.area}</td>
                              <td>
                                <strong>{formatTaka(order.total)}</strong>
                              </td>
                              <td>
                                <span className={`adm-status ${st.color}`}>
                                  <i className={`bi ${st.icon}`} aria-hidden="true" />
                                  {st.label}
                                </span>
                              </td>
                              <td style={{ color: "var(--adm-muted)", fontSize: "0.75rem" }}>
                                {relativeTime(order.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Low Stock Radar */}
                  <section className="adm-card">
                    <div className="adm-card-head">
                      <div>
                        <h2>Haat Restock Radar</h2>
                        <p>Items running under 15 units in warehouse</p>
                      </div>
                      <button
                        type="button"
                        className="adm-btn adm-btn-secondary adm-btn-sm"
                        onClick={() => {
                          setProdStockFilter("low");
                          setTab("products");
                        }}
                      >
                        Manage
                      </button>
                    </div>

                    {lowStockProducts.length === 0 ? (
                      <div style={{ fontSize: "0.8rem", color: "var(--adm-muted)" }}>
                        All grocery aisles are well stocked above threshold.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10 }}>
                        {lowStockProducts.map((p) => (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div className="adm-prod-cell">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.imageUrl} alt="" style={{ width: 36, height: 36 }} />
                              <div>
                                <div className="adm-prod-title" style={{ fontSize: "0.79rem" }}>
                                  {p.name}
                                </div>
                                <div className="adm-prod-sub">
                                  {p.stockQty} left · {p.unit}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="adm-btn adm-btn-secondary adm-btn-sm"
                              onClick={() =>
                                void handleQuickPatchProduct(
                                  p.id,
                                  { stockQty: p.stockQty + 30, inStock: true },
                                  `Restocked +30 ${p.name}`,
                                )
                              }
                            >
                              +30 Stock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Top Bestsellers */}
                  <section className="adm-card">
                    <div className="adm-card-head">
                      <div>
                        <h2>Top Revenue SKUs</h2>
                        <p>Highest earning groceries across orders</p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {topSellingProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 10,
                          }}
                        >
                          <div className="adm-prod-cell">
                            <span
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: 7,
                                background: "var(--adm-emerald-soft)",
                                color: "var(--adm-emerald)",
                                display: "grid",
                                placeItems: "center",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                              }}
                            >
                              {idx + 1}
                            </span>
                            <div>
                              <div className="adm-prod-title" style={{ fontSize: "0.8rem" }}>
                                {p.name}
                              </div>
                              <div className="adm-prod-sub">{p.soldCount} units sold</div>
                            </div>
                          </div>
                          <strong style={{ fontSize: "0.82rem" }}>{formatTaka(p.revenue)}</strong>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Operations Audit Feed */}
              <section className="adm-card">
                <div className="adm-card-head">
                  <div>
                    <h2>Live Operations Activity Log</h2>
                    <p>Real-time audit stream of customer orders, rider dispatches and catalog edits</p>
                  </div>
                </div>
                <div className="adm-feed">
                  {data.activities.slice(0, 7).map((act) => {
                    const icon =
                      act.category === "order"
                        ? "bi-truck"
                        : act.category === "product"
                          ? "bi-box-seam"
                          : act.category === "promo"
                            ? "bi-ticket-perforated"
                            : "bi-shield-check";
                    return (
                      <div className="adm-feed-item" key={act.id}>
                        <span className="adm-feed-dot">
                          <i className={`bi ${icon}`} aria-hidden="true" />
                        </span>
                        <div className="adm-feed-body">
                          <p>
                            <strong>{act.actor}</strong> — {act.action}
                          </p>
                          <small>
                            {act.target ? `${act.target} · ` : ""}
                            {relativeTime(act.createdAt)}
                          </small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* ==================== TAB 2: ORDERS & DISPATCH ==================== */}
          {tab === "orders" && (
            <>
              <div className="adm-toolbar">
                <div className="adm-pills">
                  <button
                    type="button"
                    className={`adm-pill ${orderStatusFilter === "all" ? "active" : ""}`}
                    onClick={() => setOrderStatusFilter("all")}
                  >
                    All <span className="cnt">{data.orders.length}</span>
                  </button>
                  {ORDER_STATUSES.map((st) => (
                    <button
                      type="button"
                      key={st.value}
                      className={`adm-pill ${orderStatusFilter === st.value ? "active" : ""}`}
                      onClick={() => setOrderStatusFilter(st.value)}
                    >
                      <i className={`bi ${st.icon}`} aria-hidden="true" />
                      {st.label}{" "}
                      <span className="cnt">{data.statusCounts[st.value] ?? 0}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div className="adm-search-box">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Search order #, customer, phone…"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="adm-select"
                    value={orderAreaFilter}
                    onChange={(e) => setOrderAreaFilter(e.target.value)}
                    aria-label="Filter by Dhaka area"
                  >
                    <option value="all">All Dhaka Areas</option>
                    <option value="Dhanmondi">Dhanmondi</option>
                    <option value="Gulshan">Gulshan</option>
                    <option value="Uttara">Uttara</option>
                    <option value="Mirpur">Mirpur</option>
                  </select>

                  <div
                    style={{
                      display: "inline-flex",
                      border: "1px solid var(--adm-line)",
                      borderRadius: 10,
                      overflow: "hidden",
                      background: "var(--adm-surface)",
                    }}
                  >
                    <button
                      type="button"
                      className={`adm-btn adm-btn-sm ${
                        orderView === "table" ? "adm-btn-primary" : ""
                      }`}
                      style={{ borderRadius: 0 }}
                      onClick={() => setOrderView("table")}
                    >
                      <i className="bi bi-table" aria-hidden="true" /> Table
                    </button>
                    <button
                      type="button"
                      className={`adm-btn adm-btn-sm ${
                        orderView === "kanban" ? "adm-btn-primary" : ""
                      }`}
                      style={{ borderRadius: 0 }}
                      onClick={() => setOrderView("kanban")}
                    >
                      <i className="bi bi-kanban" aria-hidden="true" /> Board
                    </button>
                  </div>

                  <button
                    type="button"
                    className="adm-btn adm-btn-secondary"
                    onClick={exportOrdersCsv}
                  >
                    <i className="bi bi-download" aria-hidden="true" /> CSV
                  </button>
                </div>
              </div>

              {orderView === "table" ? (
                <section className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Dhaka Hub</th>
                          <th>Items</th>
                          <th>Payment</th>
                          <th>Total</th>
                          <th>Rider</th>
                          <th>Status</th>
                          <th>Placed</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={10} style={{ textAlign: "center", padding: 36 }}>
                              No orders match the current filters.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => {
                            const st =
                              ORDER_STATUSES.find((s) => s.value === order.status) ??
                              ORDER_STATUSES[0];
                            return (
                              <tr key={order.id}>
                                <td>
                                  <button
                                    type="button"
                                    style={{
                                      border: 0,
                                      background: "none",
                                      padding: 0,
                                      fontWeight: 800,
                                      color: "var(--adm-emerald)",
                                    }}
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    {order.orderNumber}
                                  </button>
                                </td>
                                <td>
                                  <div className="adm-prod-title">{order.customerName}</div>
                                  <div className="adm-prod-sub">{order.phone}</div>
                                </td>
                                <td>{order.area}</td>
                                <td>{order.items.reduce((s, i) => s + i.quantity, 0)} pcs</td>
                                <td>
                                  <span style={{ textTransform: "uppercase", fontWeight: 700, fontSize: "0.73rem" }}>
                                    {order.paymentMethod}
                                  </span>
                                </td>
                                <td>
                                  <strong>{formatTaka(order.total)}</strong>
                                </td>
                                <td>
                                  <select
                                    className="adm-select"
                                    style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                                    value={order.riderName}
                                    onChange={(e) =>
                                      void handleUpdateOrder({
                                        id: order.id,
                                        riderName: e.target.value,
                                      })
                                    }
                                    aria-label={`Assign rider for ${order.orderNumber}`}
                                  >
                                    <option value="">Assign rider…</option>
                                    {DHAKA_RIDERS.map((r) => (
                                      <option key={r} value={r}>
                                        {r}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <select
                                    className="adm-select"
                                    style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                                    value={order.status}
                                    onChange={(e) =>
                                      void handleUpdateOrder({
                                        id: order.id,
                                        status: e.target.value,
                                      })
                                    }
                                    aria-label={`Status for ${order.orderNumber}`}
                                  >
                                    {ORDER_STATUSES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <div style={{ marginTop: 3 }}>
                                    <span className={`adm-status ${st.color}`}>
                                      <i className={`bi ${st.icon}`} aria-hidden="true" />
                                      {st.label}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ fontSize: "0.74rem", color: "var(--adm-muted)" }}>
                                  {dhakaDate.format(new Date(order.createdAt))}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="adm-btn adm-btn-secondary adm-btn-sm"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <div className="adm-kanban">
                  {ORDER_STATUSES.filter((s) => s.value !== "cancelled").map((col) => {
                    const colOrders = filteredOrders.filter((o) => o.status === col.value);
                    const nextStage =
                      col.value === "confirmed"
                        ? "packing"
                        : col.value === "packing"
                          ? "out_for_delivery"
                          : col.value === "out_for_delivery"
                            ? "delivered"
                            : null;

                    return (
                      <div className="adm-kanban-col" key={col.value}>
                        <div className="adm-kanban-head">
                          <strong>
                            <i className={`bi ${col.icon}`} aria-hidden="true" />
                            {col.label}
                          </strong>
                          <span className={`adm-status ${col.color}`}>{colOrders.length}</span>
                        </div>

                        {colOrders.map((order) => (
                          <div
                            className="adm-kanban-card"
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <div className="adm-kc-top">
                              <span className="adm-kc-id">{order.orderNumber}</span>
                              <span>{relativeTime(order.createdAt)}</span>
                            </div>
                            <div className="adm-kc-cust">{order.customerName}</div>
                            <div className="adm-kc-meta">
                              <span>
                                <i className="bi bi-geo-alt" aria-hidden="true" /> {order.area}
                              </span>
                              <strong>{formatTaka(order.total)}</strong>
                            </div>
                            {order.riderName && (
                              <div style={{ fontSize: "0.71rem", color: "var(--adm-emerald)" }}>
                                <i className="bi bi-bicycle" aria-hidden="true" /> {order.riderName}
                              </div>
                            )}
                            {nextStage && (
                              <button
                                type="button"
                                className="adm-btn adm-btn-secondary adm-btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleUpdateOrder({ id: order.id, status: nextStage });
                                }}
                              >
                                Advance Stage <i className="bi bi-arrow-right" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ==================== TAB 3: PRODUCTS & INVENTORY ==================== */}
          {tab === "products" && (
            <>
              <div className="adm-toolbar">
                <div className="adm-pills">
                  <button
                    type="button"
                    className={`adm-pill ${prodStockFilter === "all" ? "active" : ""}`}
                    onClick={() => setProdStockFilter("all")}
                  >
                    All SKUs <span className="cnt">{data.products.length}</span>
                  </button>
                  <button
                    type="button"
                    className={`adm-pill ${prodStockFilter === "deals" ? "active" : ""}`}
                    onClick={() => setProdStockFilter("deals")}
                  >
                    <i className="bi bi-lightning-charge-fill" aria-hidden="true" /> Daily Deals{" "}
                    <span className="cnt">{data.metrics.dealsCount}</span>
                  </button>
                  <button
                    type="button"
                    className={`adm-pill ${prodStockFilter === "low" ? "active" : ""}`}
                    onClick={() => setProdStockFilter("low")}
                  >
                    Low Stock <span className="cnt">{data.metrics.lowStockCount}</span>
                  </button>
                  <button
                    type="button"
                    className={`adm-pill ${prodStockFilter === "out" ? "active" : ""}`}
                    onClick={() => setProdStockFilter("out")}
                  >
                    Sold Out <span className="cnt">{data.metrics.outOfStockCount}</span>
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div className="adm-search-box">
                    <i className="bi bi-search" aria-hidden="true" />
                    <input
                      type="search"
                      placeholder="Filter rice, ilish, brand…"
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                    />
                  </div>

                  <select
                    className="adm-select"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    aria-label="Filter by category"
                  >
                    <option value="all">All Aisles</option>
                    {data.categories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="adm-btn adm-btn-primary"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                  >
                    <i className="bi bi-plus-lg" aria-hidden="true" /> Add Product
                  </button>
                </div>
              </div>

              <section className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Aisle</th>
                        <th>Price (BDT)</th>
                        <th>Stock Level</th>
                        <th>Sales</th>
                        <th>Daily Deal</th>
                        <th>Live</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        const off = discountPercent(product.price, product.oldPrice);
                        const cat = data.categories.find((c) => c.slug === product.categorySlug);
                        const stockBadge =
                          !product.inStock || product.stockQty <= 0
                            ? { cls: "rose", text: "Out of stock" }
                            : product.stockQty <= 15
                              ? { cls: "amber", text: `${product.stockQty} low` }
                              : { cls: "emerald", text: `${product.stockQty} in stock` };

                        return (
                          <tr key={product.id}>
                            <td>
                              <div className="adm-prod-cell">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={product.imageUrl} alt="" loading="lazy" />
                                <div>
                                  <div className="adm-prod-title">
                                    {product.name}{" "}
                                    {product.badge && (
                                      <span
                                        className="adm-status emerald"
                                        style={{ fontSize: "0.62rem", padding: "1px 6px" }}
                                      >
                                        {product.badge}
                                      </span>
                                    )}
                                  </div>
                                  <div className="adm-prod-sub">
                                    {product.coName} · {product.unit} · ★ {product.rating.toFixed(1)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.78rem", fontWeight: 600 }}>
                                {cat ? `${cat.icon} ${cat.name}` : product.categorySlug}
                              </span>
                            </td>
                            <td>
                              <strong>{formatTaka(product.price)}</strong>
                              {product.oldPrice ? (
                                <div className="adm-prod-sub">
                                  <s>{formatTaka(product.oldPrice)}</s> (-{off}%)
                                </div>
                              ) : null}
                            </td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span className={`adm-status ${stockBadge.cls}`}>
                                  {stockBadge.text}
                                </span>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-secondary adm-btn-sm"
                                  title="Add 20 units"
                                  onClick={() =>
                                    void handleQuickPatchProduct(
                                      product.id,
                                      { stockQty: product.stockQty + 20, inStock: true },
                                      `Added +20 stock to ${product.name}`,
                                    )
                                  }
                                >
                                  +20
                                </button>
                              </div>
                            </td>
                            <td>
                              <div style={{ fontWeight: 700 }}>{formatTaka(product.revenue)}</div>
                              <div className="adm-prod-sub">{product.soldCount} sold</div>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`adm-switch ${product.isDeal ? "on" : ""}`}
                                onClick={() =>
                                  void handleQuickPatchProduct(
                                    product.id,
                                    { isDeal: !product.isDeal },
                                    `${product.name} ${
                                      !product.isDeal ? "added to Daily Deals" : "removed from Deals"
                                    }`,
                                  )
                                }
                                aria-label={`Toggle deal for ${product.name}`}
                              >
                                <span />
                              </button>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={`adm-switch ${product.inStock ? "on" : ""}`}
                                onClick={() =>
                                  void handleQuickPatchProduct(
                                    product.id,
                                    { inStock: !product.inStock },
                                    `${product.name} ${
                                      !product.inStock ? "marked In Stock" : "marked Sold Out"
                                    }`,
                                  )
                                }
                                aria-label={`Toggle availability for ${product.name}`}
                              >
                                <span />
                              </button>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-secondary adm-btn-sm"
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setProductModalOpen(true);
                                  }}
                                >
                                  <i className="bi bi-pencil-square" aria-hidden="true" /> Edit
                                </button>
                                <button
                                  type="button"
                                  className="adm-btn adm-btn-danger adm-btn-sm"
                                  onClick={() => void handleDeleteProduct(product)}
                                  aria-label={`Delete ${product.name}`}
                                >
                                  <i className="bi bi-trash3" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ==================== TAB 4: STORE AISLES (CATEGORIES) ==================== */}
          {tab === "categories" && (
            <>
              <div className="adm-toolbar">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.08rem" }}>
                    Bazar Aisles ({data.categories.length})
                  </h2>
                  <small style={{ color: "var(--adm-muted)", fontSize: "0.77rem" }}>
                    Organise how Dhaka shoppers browse categories in the header strip and sidebar
                  </small>
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={() => {
                    setCatForm({ name: "", blurb: "", icon: "🥭" });
                    setCatModalOpen(true);
                  }}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> New Aisle
                </button>
              </div>

              <div className="adm-grid-3">
                {data.categories.map((cat) => (
                  <article className="adm-aisle-card" key={cat.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span className="adm-aisle-icon">{cat.icon}</span>
                      <span className="adm-status emerald">{cat.productCount} SKUs</span>
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 3px", fontSize: "1rem" }}>{cat.name}</h3>
                      <p style={{ margin: 0, fontSize: "0.77rem", color: "var(--adm-muted)" }}>
                        {cat.blurb}
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 10,
                        borderTop: "1px dashed var(--adm-line)",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span>
                        Revenue: <strong>{formatTaka(cat.revenue)}</strong>
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="adm-btn adm-btn-secondary adm-btn-sm"
                          onClick={() => {
                            setCatForm({
                              id: cat.id,
                              name: cat.name,
                              blurb: cat.blurb,
                              icon: cat.icon,
                            });
                            setCatModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        {cat.productCount === 0 && (
                          <button
                            type="button"
                            className="adm-btn adm-btn-danger adm-btn-sm"
                            onClick={() => void handleDeleteCategory(cat)}
                          >
                            <i className="bi bi-trash3" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* ==================== TAB 5: PROMOS & CAMPAIGNS ==================== */}
          {tab === "promos" && (
            <>
              <div className="adm-toolbar">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.08rem" }}>
                    Promo Codes &amp; Flash Campaigns
                  </h2>
                  <small style={{ color: "var(--adm-muted)", fontSize: "0.77rem" }}>
                    Active coupons work immediately in the customer slide-out bag and checkout
                  </small>
                </div>
                <button
                  type="button"
                  className="adm-btn adm-btn-primary"
                  onClick={() => setPromoModalOpen(true)}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Create Promo Code
                </button>
              </div>

              <div className="adm-grid-equal">
                {data.promos.map((promo) => (
                  <div
                    className={`adm-coupon-card ${promo.active ? "live" : ""}`}
                    key={promo.id}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <span className="adm-coupon-code">
                        <i className="bi bi-ticket-perforated-fill" aria-hidden="true" />
                        {promo.code}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`adm-status ${promo.active ? "emerald" : "amber"}`}>
                          {promo.active ? "Active" : "Paused"}
                        </span>
                        <button
                          type="button"
                          className={`adm-switch ${promo.active ? "on" : ""}`}
                          onClick={() => void handleTogglePromo(promo)}
                          aria-label={`Toggle ${promo.code}`}
                        >
                          <span />
                        </button>
                      </div>
                    </div>

                    <div>
                      <strong style={{ fontSize: "0.94rem", display: "block" }}>
                        {promo.title}
                      </strong>
                      <span style={{ fontSize: "0.77rem", color: "var(--adm-muted)" }}>
                        {promo.discountType === "fixed"
                          ? `Flat ${formatTaka(promo.discountValue)} discount`
                          : `${promo.discountValue}% off bag subtotal`}
                        {promo.minOrder > 0 ? ` · Min order ${formatTaka(promo.minOrder)}` : " · No minimum"}
                        {promo.maxDiscount ? ` · Cap ${formatTaka(promo.maxDiscount)}` : ""}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 10,
                        borderTop: "1px dashed var(--adm-line)",
                        fontSize: "0.76rem",
                        color: "var(--adm-muted)",
                      }}
                    >
                      <span>
                        Redeemed <strong>{promo.usageCount}</strong> times
                      </span>
                      {promo.code !== "KINOO10" && (
                        <button
                          type="button"
                          className="adm-btn adm-btn-danger adm-btn-sm"
                          onClick={() => void handleDeletePromo(promo)}
                        >
                          <i className="bi bi-trash3" aria-hidden="true" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ==================== TAB 6: CUSTOMERS CRM ==================== */}
          {tab === "customers" && (
            <>
              <div className="adm-toolbar">
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.08rem" }}>
                    Dhaka Household Directory ({data.customers.length})
                  </h2>
                  <small style={{ color: "var(--adm-muted)", fontSize: "0.77rem" }}>
                    Lifetime spend, preferred mobile wallet and order frequency per household
                  </small>
                </div>

                <div className="adm-search-box">
                  <i className="bi bi-search" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search name, phone or area…"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>

              <section className="adm-card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Household</th>
                        <th>Area &amp; Address</th>
                        <th>Orders</th>
                        <th>Preferred Pay</th>
                        <th>Lifetime Spend</th>
                        <th>Last Order</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((cust) => (
                        <tr key={cust.phone}>
                          <td>
                            <div className="adm-prod-title">
                              {cust.name}{" "}
                              {cust.orderCount >= 2 && (
                                <span className="adm-status emerald" style={{ fontSize: "0.62rem" }}>
                                  Repeat VIP
                                </span>
                              )}
                            </div>
                            <div className="adm-prod-sub">{cust.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: "0.79rem" }}>{cust.area}</div>
                            <div className="adm-prod-sub">{cust.address}</div>
                          </td>
                          <td>
                            <strong>{cust.orderCount}</strong> bags
                          </td>
                          <td>
                            <span
                              style={{
                                textTransform: "uppercase",
                                fontSize: "0.73rem",
                                fontWeight: 800,
                              }}
                            >
                              {cust.preferredPayment}
                            </span>
                          </td>
                          <td>
                            <strong style={{ color: "var(--adm-emerald)" }}>
                              {formatTaka(cust.totalSpent)}
                            </strong>
                          </td>
                          <td>
                            <div style={{ fontSize: "0.77rem", fontWeight: 700 }}>
                              {cust.lastOrderNumber}
                            </div>
                            <div className="adm-prod-sub">{relativeTime(cust.lastOrderAt)}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ==================== TAB 7: STORE SETTINGS ==================== */}
          {tab === "settings" && (
            <form onSubmit={(e) => void handleSaveSettings(e)} className="adm-grid-2">
              <section className="adm-card">
                <div className="adm-card-head">
                  <div>
                    <h2>Storefront &amp; Delivery Rules</h2>
                    <p>Configure hotline, delivery charges, free-delivery threshold and wallet merchants</p>
                  </div>
                </div>

                <div className="adm-form-grid">
                  <div className="adm-field">
                    <label htmlFor="stName">Store Name</label>
                    <input
                      id="stName"
                      value={settingsDraft.storeName ?? "Kinoo"}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, storeName: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stHotline">Customer Hotline</label>
                    <input
                      id="stHotline"
                      value={settingsDraft.hotline ?? ""}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, hotline: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stFee">Standard Delivery Charge (৳)</label>
                    <input
                      id="stFee"
                      type="number"
                      value={settingsDraft.deliveryFee ?? "50"}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, deliveryFee: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stFree">Free Delivery Threshold (৳)</label>
                    <input
                      id="stFree"
                      type="number"
                      value={settingsDraft.freeDeliveryThreshold ?? "1000"}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({
                          ...s,
                          freeDeliveryThreshold: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stBkash">bKash Merchant Wallet</label>
                    <input
                      id="stBkash"
                      value={settingsDraft.bkashMerchant ?? ""}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, bkashMerchant: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stNagad">Nagad Merchant Wallet</label>
                    <input
                      id="stNagad"
                      value={settingsDraft.nagadMerchant ?? ""}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, nagadMerchant: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stWindow">Delivery SLA Window</label>
                    <input
                      id="stWindow"
                      value={settingsDraft.deliveryWindow ?? "60–90 minutes"}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, deliveryWindow: e.target.value }))
                      }
                    />
                  </div>

                  <div className="adm-field">
                    <label htmlFor="stEmail">Support Email</label>
                    <input
                      id="stEmail"
                      type="email"
                      value={settingsDraft.supportEmail ?? ""}
                      onChange={(e) =>
                        setSettingsDraft((s) => ({ ...s, supportEmail: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="adm-btn adm-btn-primary"
                    disabled={savingSettings}
                  >
                    <i className="bi bi-check2-circle" aria-hidden="true" />
                    {savingSettings ? "Saving…" : "Save Store Configuration"}
                  </button>
                </div>
              </section>

              <section className="adm-card">
                <div className="adm-card-head">
                  <div>
                    <h2>Dispatch Hubs &amp; Operations Status</h2>
                    <p>Control live order intake and inspect active Dhaka micro-warehouses</p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 14,
                    borderRadius: 13,
                    background: "var(--adm-surface-2)",
                    border: "1px solid var(--adm-line)",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <strong style={{ display: "block", fontSize: "0.86rem" }}>
                      Storefront Order Intake
                    </strong>
                    <span style={{ fontSize: "0.74rem", color: "var(--adm-muted)" }}>
                      {storeIsOpen
                        ? "Customers can place instant orders across Dhaka"
                        : "Paused — temporary maintenance banner active"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`adm-switch ${storeIsOpen ? "on" : ""}`}
                    onClick={() =>
                      setSettingsDraft((s) => ({
                        ...s,
                        storeOpen: storeIsOpen ? "false" : "true",
                      }))
                    }
                    aria-label="Toggle storefront open status"
                  >
                    <span />
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { hub: "Dhanmondi Darkstore", riders: 6, sla: "52 min avg" },
                    { hub: "Gulshan-2 Cold Hub", riders: 8, sla: "48 min avg" },
                    { hub: "Uttara Sector-7 Hub", riders: 5, sla: "64 min avg" },
                    { hub: "Mirpur-10 Bazar Hub", riders: 5, sla: "61 min avg" },
                  ].map((h) => (
                    <div
                      key={h.hub}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "11px 13px",
                        borderRadius: 12,
                        border: "1px solid var(--adm-line)",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.82rem", display: "block" }}>{h.hub}</strong>
                        <span style={{ fontSize: "0.72rem", color: "var(--adm-muted)" }}>
                          {h.riders} riders active · {h.sla}
                        </span>
                      </div>
                      <span className="adm-status emerald">Online</span>
                    </div>
                  ))}
                </div>
              </section>
            </form>
          )}
        </div>
      </div>

      {/* ==================== ORDER INSPECTOR DRAWER ==================== */}
      <OrderDrawer
        key={selectedOrder ? `${selectedOrder.id}-${selectedOrder.status}-${selectedOrder.riderName}` : "closed"}
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSave={handleUpdateOrder}
      />

      {/* ==================== PRODUCT MODAL ==================== */}
      <ProductModal
        key={productModalOpen ? `prod-${editingProduct?.id ?? "new"}` : "prod-closed"}
        open={productModalOpen}
        product={editingProduct}
        categories={data.categories}
        onClose={() => setProductModalOpen(false)}
        onSubmit={handleSaveProduct}
      />

      {/* ==================== CATEGORY MODAL ==================== */}
      {catModalOpen && (
        <div className="adm-overlay" onClick={() => setCatModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 440 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 14px", fontSize: "1.06rem" }}>
              {catForm.id ? "Edit Store Aisle" : "Create New Store Aisle"}
            </h2>
            <form onSubmit={(e) => void handleSaveCategory(e)} style={{ display: "grid", gap: 12 }}>
              <div className="adm-field">
                <label htmlFor="catIcon">Emoji Icon</label>
                <input
                  id="catIcon"
                  value={catForm.icon}
                  onChange={(e) => setCatForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="🥬"
                />
              </div>
              <div className="adm-field">
                <label htmlFor="catName">Aisle Name *</label>
                <input
                  id="catName"
                  required
                  value={catForm.name}
                  onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Bakery & Mishti"
                />
              </div>
              <div className="adm-field">
                <label htmlFor="catBlurb">Tagline / Blurb</label>
                <input
                  id="catBlurb"
                  value={catForm.blurb}
                  onChange={(e) => setCatForm((f) => ({ ...f, blurb: e.target.value }))}
                  placeholder="Warm loaves & traditional sweets"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setCatModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="adm-btn adm-btn-primary">
                  Save Aisle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== PROMO MODAL ==================== */}
      {promoModalOpen && (
        <div className="adm-overlay" onClick={() => setPromoModalOpen(false)}>
          <div
            className="adm-modal"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: "0 0 14px", fontSize: "1.06rem" }}>Launch New Promo Code</h2>
            <form onSubmit={(e) => void handleCreatePromo(e)} className="adm-form-grid">
              <div className="adm-field">
                <label htmlFor="pCode">Coupon Code *</label>
                <input
                  id="pCode"
                  required
                  value={promoForm.code}
                  onChange={(e) =>
                    setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="DHAKA20"
                />
              </div>
              <div className="adm-field">
                <label htmlFor="pType">Discount Type</label>
                <select
                  id="pType"
                  value={promoForm.discountType}
                  onChange={(e) => setPromoForm((f) => ({ ...f, discountType: e.target.value }))}
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Flat Taka (৳)</option>
                </select>
              </div>
              <div className="adm-field full">
                <label htmlFor="pTitle">Campaign Title *</label>
                <input
                  id="pTitle"
                  required
                  value={promoForm.title}
                  onChange={(e) => setPromoForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Weekend Bazar 20% Off"
                />
              </div>
              <div className="adm-field">
                <label htmlFor="pVal">
                  Discount Value ({promoForm.discountType === "fixed" ? "৳" : "%"})
                </label>
                <input
                  id="pVal"
                  type="number"
                  min="1"
                  required
                  value={promoForm.discountValue}
                  onChange={(e) => setPromoForm((f) => ({ ...f, discountValue: e.target.value }))}
                />
              </div>
              <div className="adm-field">
                <label htmlFor="pMin">Min Subtotal (৳)</label>
                <input
                  id="pMin"
                  type="number"
                  min="0"
                  value={promoForm.minOrder}
                  onChange={(e) => setPromoForm((f) => ({ ...f, minOrder: e.target.value }))}
                />
              </div>
              <div className="adm-field full">
                <label htmlFor="pCap">Max Discount Cap (৳ optional)</label>
                <input
                  id="pCap"
                  type="number"
                  min="0"
                  value={promoForm.maxDiscount}
                  onChange={(e) => setPromoForm((f) => ({ ...f, maxDiscount: e.target.value }))}
                />
              </div>
              <div
                className="adm-field full"
                style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 }}
              >
                <button
                  type="button"
                  className="adm-btn adm-btn-secondary"
                  onClick={() => setPromoModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="adm-btn adm-btn-primary">
                  Activate Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== COMMAND PALETTE (⌘K) ==================== */}
      {cmdOpen && (
        <div className="adm-overlay" onClick={() => setCmdOpen(false)}>
          <div className="adm-cmd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-cmd-input">
              <i className="bi bi-command" aria-hidden="true" />
              <input
                autoFocus
                type="text"
                placeholder="Jump to order, SKU, aisle or action…"
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
              />
              <button
                type="button"
                className="adm-btn adm-btn-secondary adm-btn-sm"
                onClick={() => setCmdOpen(false)}
              >
                ESC
              </button>
            </div>
            <div className="adm-cmd-list">
              {cmdResults.map((item, idx) => (
                <button
                  type="button"
                  className="adm-cmd-item"
                  key={`${item.label}-${idx}`}
                  onClick={item.run}
                >
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  <small>{item.meta}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TOASTS ==================== */}
      <div className="adm-toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="adm-toast" key={t.id}>
            <i className="bi bi-check-circle-fill" aria-hidden="true" />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
