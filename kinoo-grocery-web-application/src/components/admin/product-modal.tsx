"use client";

import { useState } from "react";
import type { AdminCategoryDto, AdminProductDto } from "@/lib/admin-types";
import { discountPercent, formatTaka } from "@/lib/kinoo";

type Props = {
  open: boolean;
  product: AdminProductDto | null;
  categories: AdminCategoryDto[];
  onClose: () => void;
  onSubmit: (payload: {
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
  }) => Promise<void>;
};

const PRESET_IMAGES = [
  {
    label: "Produce",
    url: "https://images.pexels.com/photos/37321079/pexels-photo-37321079.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=540",
  },
  {
    label: "Fish / Catch",
    url: "https://images.pexels.com/photos/14062103/pexels-photo-14062103.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=540",
  },
  {
    label: "Rice & Grains",
    url: "https://images.pexels.com/photos/36008677/pexels-photo-36008677.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=540",
  },
  {
    label: "Dairy",
    url: "https://images.pexels.com/photos/37377280/pexels-photo-37377280.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=540",
  },
];

export function ProductModal({ open, product, categories, onClose, onSubmit }: Props) {
  const [name, setName] = useState(product?.name ?? "");
  const [coName, setCoName] = useState(product?.coName ?? "Kinoo Fresh");
  const [categorySlug, setCategorySlug] = useState(
    product?.categorySlug ?? categories[0]?.slug ?? "fruits-vegetables",
  );
  const [unit, setUnit] = useState(product?.unit ?? "1 kg");
  const [price, setPrice] = useState(product ? String(product.price) : "120");
  const [oldPrice, setOldPrice] = useState(
    product?.oldPrice ? String(product.oldPrice) : "",
  );
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? PRESET_IMAGES[0]!.url);
  const [description, setDescription] = useState(product?.description ?? "");
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [rating, setRating] = useState(product ? String(product.rating) : "4.7");
  const [stockQty, setStockQty] = useState(product ? String(product.stockQty) : "45");
  const [inStock, setInStock] = useState(product ? product.inStock : true);
  const [isDeal, setIsDeal] = useState(product ? product.isDeal : false);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const numPrice = Math.max(Number(price) || 0, 1);
  const numOld = oldPrice ? Number(oldPrice) : null;
  const previewOff = discountPercent(numPrice, numOld);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSaving(true);
    try {
      await onSubmit({
        id: product?.id,
        name: name.trim(),
        coName: coName.trim() || "Kinoo Fresh",
        categorySlug,
        unit: unit.trim() || "1 pc",
        price: numPrice,
        oldPrice: numOld && numOld > numPrice ? numOld : null,
        imageUrl: imageUrl.trim() || PRESET_IMAGES[0]!.url,
        description: description.trim(),
        badge: badge.trim() || null,
        rating: Number(rating) || 4.7,
        stockQty: Math.max(Number(stockQty) || 0, 0),
        inStock,
        isDeal,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
              {product ? `Edit "${product.name}"` : "Add New Grocery SKU"}
            </h2>
            <small style={{ color: "var(--adm-muted)", fontSize: "0.75rem" }}>
              Changes sync live with the Dhaka storefront catalog.
            </small>
          </div>
          <button type="button" className="adm-icon-btn" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Live Card Preview */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 12,
            borderRadius: 14,
            background: "var(--adm-surface-2)",
            border: "1px solid var(--adm-line)",
            marginBottom: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl || PRESET_IMAGES[0]!.url}
            alt=""
            style={{
              width: 64,
              height: 64,
              borderRadius: 11,
              objectFit: "cover",
              border: "1px solid var(--adm-line)",
              flex: "none",
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--adm-muted)",
                }}
              >
                {coName || "Kinoo Fresh"}
              </span>
              {badge && <span className="adm-status emerald">{badge}</span>}
              {previewOff > 0 && <span className="adm-status amber">-{previewOff}%</span>}
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.92rem", marginTop: 2 }}>
              {name || "Your product title"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--adm-muted)" }}>
              {unit || "1 kg"} · ★ {Number(rating || 4.7).toFixed(1)} · Stock: {stockQty || 0}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--adm-emerald)" }}>
              {formatTaka(numPrice)}
            </div>
            {numOld && numOld > numPrice ? (
              <s style={{ fontSize: "0.72rem", color: "var(--adm-muted)" }}>
                {formatTaka(numOld)}
              </s>
            ) : null}
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="adm-form-grid">
            <div className="adm-field">
              <label htmlFor="prodName">Product Name *</label>
              <input
                id="prodName"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kalijeera Aromatic Rice"
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodBrand">Supplier / Brand</label>
              <input
                id="prodBrand"
                value={coName}
                onChange={(e) => setCoName(e.target.value)}
                placeholder="e.g. Dinajpur Growers"
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodCategory">Store Aisle</label>
              <select
                id="prodCategory"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="adm-field">
              <label htmlFor="prodUnit">Pack Size / Unit *</label>
              <input
                id="prodUnit"
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. 1 kg, 500 gm, 12 pcs"
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodPrice">Selling Price (৳ BDT) *</label>
              <input
                id="prodPrice"
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodOldPrice">Regular MRP (৳ optional)</label>
              <input
                id="prodOldPrice"
                type="number"
                min="0"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value)}
                placeholder="Leave blank if no discount"
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodStock">Warehouse Stock (Units)</label>
              <input
                id="prodStock"
                type="number"
                min="0"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </div>

            <div className="adm-field">
              <label htmlFor="prodBadge">Highlight Badge</label>
              <input
                id="prodBadge"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. Fresh catch, Local, Halal"
              />
            </div>

            <div className="adm-field full">
              <label htmlFor="prodImg">Image URL</label>
              <input
                id="prodImg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.pexels.com/..."
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    className="adm-btn adm-btn-secondary adm-btn-sm"
                    onClick={() => setImageUrl(preset.url)}
                  >
                    Use {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-field full">
              <label htmlFor="prodDesc">Description</label>
              <textarea
                id="prodDesc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Freshness notes, sourcing origin, or preparation details…"
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 11,
              background: "var(--adm-surface-2)",
              border: "1px solid var(--adm-line)",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                className={`adm-switch ${inStock ? "on" : ""}`}
                onClick={() => setInStock((v) => !v)}
                aria-label="Toggle in stock"
              >
                <span />
              </button>
              Available on Storefront
            </label>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <button
                type="button"
                className={`adm-switch ${isDeal ? "on" : ""}`}
                onClick={() => setIsDeal((v) => !v)}
                aria-label="Toggle daily deal"
              >
                <span />
              </button>
              Feature in Today&apos;s Bazar Deals
            </label>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 9,
              marginTop: 18,
            }}
          >
            <button type="button" className="adm-btn adm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={saving}>
              <i className="bi bi-check2-circle" aria-hidden="true" />
              {saving ? "Saving…" : product ? "Save Changes" : "Publish Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
