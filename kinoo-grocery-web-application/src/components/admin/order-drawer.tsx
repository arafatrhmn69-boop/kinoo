"use client";

import Link from "next/link";
import { useState } from "react";
import { DHAKA_RIDERS, ORDER_STATUSES, type AdminOrderDto } from "@/lib/admin-types";
import { STORE, formatTaka } from "@/lib/kinoo";

type Props = {
  order: AdminOrderDto | null;
  onClose: () => void;
  onSave: (patch: {
    id: number;
    status?: string;
    riderName?: string;
    adminNote?: string;
  }) => Promise<void>;
};

const dhakaFmt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

export function OrderDrawer({ order, onClose, onSave }: Props) {
  const [status, setStatus] = useState(order?.status ?? "confirmed");
  const [riderName, setRiderName] = useState(order?.riderName ?? "");
  const [adminNote, setAdminNote] = useState(order?.adminNote ?? "");
  const [saving, setSaving] = useState(false);

  if (!order) return null;

  const statusMeta =
    ORDER_STATUSES.find((s) => s.value === order.status) ?? ORDER_STATUSES[0];
  const paymentLabel =
    STORE.paymentMethods.find((m) => m.value === order.paymentMethod)?.label ??
    order.paymentMethod.toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: order.id,
        status,
        riderName,
        adminNote,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="adm-drawer-overlay" onClick={onClose}>
      <aside
        className="adm-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Order ${order.orderNumber}`}
      >
        <div className="adm-drawer-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: "1.04rem" }}>{order.orderNumber}</strong>
              <span className={`adm-status ${statusMeta.color}`}>
                <i className={`bi ${statusMeta.icon}`} aria-hidden="true" />
                {statusMeta.label}
              </span>
            </div>
            <small style={{ fontSize: "0.73rem", color: "var(--adm-muted)" }}>
              Placed {dhakaFmt.format(new Date(order.createdAt))} · {order.area}, Dhaka
            </small>
          </div>
          <button
            type="button"
            className="adm-icon-btn"
            onClick={onClose}
            aria-label="Close order drawer"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="adm-drawer-body">
          {/* Quick Status Pipeline */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--adm-muted)",
                marginBottom: 8,
              }}
            >
              Fulfillment Pipeline
            </label>
            <div className="adm-pills">
              {ORDER_STATUSES.map((st) => (
                <button
                  type="button"
                  key={st.value}
                  className={`adm-pill ${status === st.value ? "active" : ""}`}
                  onClick={() => setStatus(st.value)}
                >
                  <i className={`bi ${st.icon}`} aria-hidden="true" />
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer & Delivery Card */}
          <div
            style={{
              background: "var(--adm-surface-2)",
              border: "1px solid var(--adm-line)",
              borderRadius: 14,
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem" }}>{order.customerName}</div>
                <div style={{ fontSize: "0.76rem", color: "var(--adm-muted)" }}>
                  <i className="bi bi-telephone" aria-hidden="true" /> {order.phone}
                </div>
              </div>
              <span className="adm-status emerald">
                <i className="bi bi-geo-alt-fill" aria-hidden="true" />
                {order.area}
              </span>
            </div>
            <div style={{ fontSize: "0.79rem", lineHeight: 1.45 }}>{order.address}</div>
            {order.note && (
              <div
                style={{
                  fontSize: "0.75rem",
                  background: "var(--adm-amber-soft)",
                  color: "var(--adm-amber)",
                  padding: "7px 10px",
                  borderRadius: 9,
                  fontWeight: 600,
                }}
              >
                <i className="bi bi-chat-quote-fill" aria-hidden="true" /> Customer note:{" "}
                {order.note}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.75rem",
                paddingTop: 6,
                borderTop: "1px dashed var(--adm-line)",
                color: "var(--adm-muted)",
              }}
            >
              <span>
                Payment: <strong style={{ color: "var(--adm-ink)" }}>{paymentLabel}</strong>
              </span>
              {order.paymentNumber && <span>Wallet: {order.paymentNumber}</span>}
            </div>
          </div>

          {/* Rider Dispatch & Internal Note */}
          <div className="adm-form-grid">
            <div className="adm-field">
              <label htmlFor="riderSelect">Assign Dhaka Rider</label>
              <select
                id="riderSelect"
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
              >
                <option value="">Unassigned</option>
                {DHAKA_RIDERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="adminNoteInput">Internal Dispatch Note</label>
              <input
                id="adminNoteInput"
                type="text"
                placeholder="e.g. Insulated ice pack included"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.72rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--adm-muted)",
                marginBottom: 8,
              }}
            >
              Packed Items ({order.items.reduce((s, i) => s + i.quantity, 0)} units)
            </label>
            <div
              style={{
                border: "1px solid var(--adm-line)",
                borderRadius: 13,
                overflow: "hidden",
              }}
            >
              {order.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderBottom: "1px solid var(--adm-line)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt=""
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 9,
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--adm-muted)" }}>
                      {item.unit} · {formatTaka(item.price)} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "0.82rem" }}>
                    {formatTaka(item.lineTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div
            style={{
              background: "var(--adm-surface-2)",
              border: "1px solid var(--adm-line)",
              borderRadius: 13,
              padding: "12px 14px",
              display: "grid",
              gap: 6,
              fontSize: "0.8rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--adm-muted)" }}>Subtotal</span>
              <span>{formatTaka(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "var(--adm-amber)",
                  fontWeight: 700,
                }}
              >
                <span>Promo ({order.promoCode || "Discount"})</span>
                <span>−{formatTaka(order.discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--adm-muted)" }}>Delivery Charge</span>
              <span>{order.deliveryFee === 0 ? "FREE" : formatTaka(order.deliveryFee)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 800,
                fontSize: "0.95rem",
                borderTop: "1px dashed var(--adm-line)",
                paddingTop: 8,
                marginTop: 4,
              }}
            >
              <span>Total Payable</span>
              <span style={{ color: "var(--adm-emerald)" }}>{formatTaka(order.total)}</span>
            </div>
          </div>
        </div>

        <div className="adm-drawer-foot">
          <Link
            href={`/order/${order.orderNumber}`}
            target="_blank"
            className="adm-btn adm-btn-secondary"
          >
            <i className="bi bi-printer" aria-hidden="true" />
            Customer Receipt
          </Link>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="adm-btn adm-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn adm-btn-primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              <i className="bi bi-check2-circle" aria-hidden="true" />
              {saving ? "Saving…" : "Update Order"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
