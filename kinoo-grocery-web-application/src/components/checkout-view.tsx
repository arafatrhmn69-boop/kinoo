"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useKinoo } from "@/components/cart-provider";
import {
  STORE,
  deliveryFeeFor,
  discountFor,
  formatTaka,
  type PaymentMethod,
} from "@/lib/kinoo";

type FormState = {
  customerName: string;
  phone: string;
  address: string;
  note: string;
  paymentMethod: PaymentMethod;
  paymentNumber: string;
};

const PAYMENT_ICONS: Record<string, string> = {
  cod: "bi-cash-stack",
  bkash: "bi-phone",
  nagad: "bi-wallet2",
};

const PAYMENT_TAGS: Record<string, string> = {
  cod: "Most popular",
  bkash: "Instant",
  nagad: "Instant",
};

export function CheckoutView() {
  const router = useRouter();
  const { cart, ready, promo, area, setArea, refresh, clearPromo } = useKinoo();
  const [form, setForm] = useState<FormState>({
    customerName: "",
    phone: "",
    address: "",
    note: "",
    paymentMethod: "cod",
    paymentNumber: "",
  });
  const [areaValue, setAreaValue] = useState(area);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAreaValue(area);
  }, [area]);

  const subtotal = cart.subtotal;
  const discount = discountFor(subtotal, promo);
  const delivery = deliveryFeeFor(subtotal);
  const total = Math.max(subtotal - discount + delivery, 0);

  const update = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const validate = (): { message: string; field?: string } | null => {
    if (form.customerName.trim().length < 3) {
      return { message: "Please tell us your full name.", field: "customerName" };
    }
    const phone = form.phone.replace(/[\s-]/g, "").replace(/^\+?88/, "");
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      return { message: "Enter a valid 11-digit mobile number, e.g. 01712345678.", field: "phone" };
    }
    if (form.address.trim().length < 10) {
      return {
        message: "Add your house, road and a nearby landmark.",
        field: "address",
      };
    }
    if (form.paymentMethod !== "cod") {
      const wallet = form.paymentNumber.replace(/[\s-]/g, "").replace(/^\+?88/, "");
      if (wallet && !/^01[3-9]\d{8}$/.test(wallet)) {
        return { message: "That mobile banking number looks wrong.", field: "paymentNumber" };
      }
    }
    return null;
  };

  const placeOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          area: areaValue,
          promoCode: promo,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        orderNumber?: string;
        error?: string;
        field?: string;
      };

      if (!response.ok || !data.ok || !data.orderNumber) {
        setError({
          message: data.error ?? "We could not place the order. Please try again.",
          field: data.field,
        });
        setSubmitting(false);
        return;
      }

      setArea(areaValue);
      clearPromo();
      await refresh();
      router.push(`/order/${data.orderNumber}`);
    } catch {
      setError({ message: "Network issue — please check your connection and try again." });
      setSubmitting(false);
    }
  };

  if (ready && cart.items.length === 0) {
    return (
      <div className="k-container checkout-wrap">
        <div className="crumb">
          <Link href="/">Home</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <span>Checkout</span>
        </div>
        <div className="empty-state" style={{ padding: "56px 20px" }}>
          <div className="es-icon">
            <i className="bi bi-bag-x" aria-hidden="true" />
          </div>
          <h3>Your bag is empty</h3>
          <p>
            Add a few groceries and come back — checkout takes less than a minute and you can pay on
            delivery.
          </p>
          <Link className="btn-green" href="/#shop">
            Browse groceries
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="k-container checkout-wrap">
      <div className="crumb">
        <Link href="/">Home</Link>
        <i className="bi bi-chevron-right" aria-hidden="true" />
        <Link href="/#shop">Shop</Link>
        <i className="bi bi-chevron-right" aria-hidden="true" />
        <span>Checkout</span>
      </div>

      <div className="checkout-grid">
        <form className="checkout-card" onSubmit={placeOrder} noValidate>
          <h1>Checkout</h1>
          <p className="lead">
            Deliver to {areaValue}, Dhaka · usually at your door in 60–90 minutes.
          </p>

          {error && (
            <div className="form-error" role="alert">
              <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
              {error.message}
            </div>
          )}

          <div className="form-block">
            <div className="form-block-title">
              <span className="num">1</span> Contact details
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="customerName">
                  Full name <em>*</em>
                </label>
                <input
                  id="customerName"
                  type="text"
                  value={form.customerName}
                  onChange={(event) => update({ customerName: event.target.value })}
                  placeholder="e.g. Nusrat Jahan"
                  autoComplete="name"
                  className={error?.field === "customerName" ? "err" : ""}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">
                  Mobile number <em>*</em>
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={(event) => update({ phone: event.target.value })}
                  placeholder="01XXXXXXXXX"
                  autoComplete="tel"
                  className={error?.field === "phone" ? "err" : ""}
                />
                <span className="hint">We&apos;ll call before the rider arrives.</span>
              </div>
            </div>
          </div>

          <div className="form-block">
            <div className="form-block-title">
              <span className="num">2</span> Delivery address
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Area in Dhaka <em>*</em></label>
              <div className="area-pills">
                {STORE.areas.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`area-pill ${areaValue === option ? "on" : ""}`}
                    onClick={() => setAreaValue(option)}
                  >
                    <i className="bi bi-geo-alt" aria-hidden="true" />
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">
                House, road &amp; landmark <em>*</em>
              </label>
              <textarea
                id="address"
                value={form.address}
                onChange={(event) => update({ address: event.target.value })}
                placeholder="House 12, Road 7, Dhanmondi — beside Rapa Plaza"
                autoComplete="street-address"
                className={error?.field === "address" ? "err" : ""}
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="note">Delivery instructions (optional)</label>
              <input
                id="note"
                type="text"
                value={form.note}
                onChange={(event) => update({ note: event.target.value })}
                placeholder="Call on arrival, leave at the reception…"
              />
            </div>
          </div>

          <div className="form-block">
            <div className="form-block-title">
              <span className="num">3</span> Payment method
            </div>
            <div className="pay-options">
              {STORE.paymentMethods.map((method) => (
                <label
                  key={method.value}
                  className={`pay-option ${form.paymentMethod === method.value ? "on" : ""}`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={form.paymentMethod === method.value}
                    onChange={() => update({ paymentMethod: method.value })}
                  />
                  <span className="po-icon">
                    <i className={`bi ${PAYMENT_ICONS[method.value]}`} aria-hidden="true" />
                  </span>
                  <span className="po-body">
                    <strong>{method.label}</strong>
                    <span>{method.hint}</span>
                  </span>
                  <span className="po-tag">{PAYMENT_TAGS[method.value]}</span>
                </label>
              ))}
            </div>

            {form.paymentMethod !== "cod" && (
              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="paymentNumber">
                  Your {form.paymentMethod === "bkash" ? "bKash" : "Nagad"} number
                </label>
                <input
                  id="paymentNumber"
                  type="tel"
                  inputMode="numeric"
                  value={form.paymentNumber}
                  onChange={(event) => update({ paymentNumber: event.target.value })}
                  placeholder="01XXXXXXXXX"
                  className={error?.field === "paymentNumber" ? "err" : ""}
                />
                <span className="hint">
                  We&apos;ll send a payment request right after you place the order.
                </span>
              </div>
            )}
          </div>

          <div className="checkout-actions">
            <button className="btn-green" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner" /> Placing your order…
                </>
              ) : (
                <>
                  Place order · {formatTaka(total)}
                  <i className="bi bi-check2-circle" aria-hidden="true" />
                </>
              )}
            </button>
            <Link className="btn-ghost" href="/#shop">
              <i className="bi bi-arrow-left" aria-hidden="true" />
              Keep shopping
            </Link>
          </div>
        </form>

        <aside className="order-summary">
          <h2>
            Order summary <span className="cd-count">{cart.count} items</span>
          </h2>

          <div className="os-items">
            {cart.items.map((item) => (
              <div className="os-item" key={item.productId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} loading="lazy" />
                <div>
                  <div className="n">{item.name}</div>
                  <div className="m">
                    {item.unit} × {item.quantity}
                  </div>
                </div>
                <div className="p">{formatTaka(item.lineTotal)}</div>
              </div>
            ))}
            {cart.items.length === 0 && (
              <p className="muted" style={{ fontSize: ".8rem" }}>
                Loading your bag…
              </p>
            )}
          </div>

          <div className="os-divider" />

          <div className="sum-row">
            <span>Subtotal</span>
            <span>{formatTaka(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="sum-row discount">
              <span>Promo ({promo})</span>
              <span>−{formatTaka(discount)}</span>
            </div>
          )}
          <div className="sum-row">
            <span>Delivery charge</span>
            <span className={delivery === 0 ? "free-tag" : ""}>
              {delivery === 0 ? "FREE" : formatTaka(delivery)}
            </span>
          </div>
          <div className="sum-row total">
            <span>Total payable</span>
            <span>{formatTaka(total)}</span>
          </div>

          {promo === "" && (
            <p className="muted" style={{ fontSize: ".72rem", margin: "-4px 0 0" }}>
              Have a code? Apply <strong>{STORE.promoCode}</strong> in the bag to save 10%.
            </p>
          )}

          <div className="os-perks">
            <div className="os-perk">
              <i className="bi bi-shield-check" aria-hidden="true" />
              Freshness guaranteed or money back
            </div>
            <div className="os-perk">
              <i className="bi bi-clock-history" aria-hidden="true" />
              Delivery window 60–90 minutes
            </div>
            <div className="os-perk">
              <i className="bi bi-bag-check" aria-hidden="true" />
              {delivery === 0
                ? "Free delivery unlocked on this order"
                : `Free delivery over ${formatTaka(STORE.freeDeliveryThreshold)}`}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
