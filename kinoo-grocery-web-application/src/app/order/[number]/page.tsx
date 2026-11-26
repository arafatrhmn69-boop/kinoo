import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORE, formatTaka } from "@/lib/kinoo";
import { getOrderByNumber } from "@/lib/orders";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ number: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Order ${decodeURIComponent(number)} — Kinoo`,
    description: "Your Kinoo grocery order receipt.",
  };
}

const dhakaTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

export default async function OrderPage({ params }: PageProps) {
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));

  if (!order) notFound();

  const paymentLabel =
    STORE.paymentMethods.find((method) => method.value === order.paymentMethod)?.label ??
    order.paymentMethod;
  const firstName = order.customerName.split(" ")[0];
  const placedAt = dhakaTime.format(order.createdAt);
  const eta = new Date(order.createdAt.getTime() + 90 * 60 * 1000);

  return (
    <div className="k-container receipt-wrap">
      <div className="receipt-card">
        <div className="receipt-top">
          <div className="receipt-check">
            <i className="bi bi-check2" aria-hidden="true" />
          </div>
          <h1>Order confirmed, {firstName}!</h1>
          <p>
            Your bag is being picked fresh at the Kinoo bazar. Keep your phone close — the rider will
            call before arriving.
          </p>
          <div className="order-id-pill">
            <i className="bi bi-receipt" aria-hidden="true" />
            {order.orderNumber}
          </div>
        </div>

        <div className="receipt-body">
          <div className="inline-note">
            <i className="bi bi-truck" aria-hidden="true" />
            <span>
              Estimated delivery today by{" "}
              <strong>
                {eta.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Dhaka",
                })}
              </strong>{" "}
              to {order.area}, Dhaka. Placed {placedAt}.
            </span>
          </div>

          <div className="receipt-grid">
            <div className="receipt-block">
              <h3>Deliver to</h3>
              <p>
                <strong>{order.customerName}</strong>
                <br />
                {order.address}
                <br />
                {order.area}, Dhaka
              </p>
              <p className="muted" style={{ marginTop: 4 }}>
                <i className="bi bi-telephone" aria-hidden="true" /> {order.phone}
              </p>
              {order.note && (
                <p className="muted" style={{ marginTop: 4 }}>
                  Note: {order.note}
                </p>
              )}
            </div>
            <div className="receipt-block">
              <h3>Payment &amp; status</h3>
              <p>
                <strong>{paymentLabel}</strong>
                <br />
                {order.paymentNumber
                  ? `Wallet: ${order.paymentNumber}`
                  : order.paymentMethod === "cod"
                    ? "Pay the rider on arrival"
                    : "A payment request will reach your wallet shortly"}
              </p>
              <p className="muted" style={{ marginTop: 4 }}>
                Status: {order.status} · {order.items.length} line items
              </p>
              {order.promoCode && (
                <p className="muted" style={{ marginTop: 4 }}>
                  Promo applied: {order.promoCode} (−{formatTaka(order.discount)})
                </p>
              )}
            </div>
          </div>

          <div className="receipt-items">
            <div className="ri-row ri-head">
              <span />
              <span>Item</span>
              <span className="q">Qty</span>
              <span className="t">Total</span>
            </div>
            {order.items.map((item) => (
              <div className="ri-row" key={item.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="" />
                <div>
                  <div className="n">{item.name}</div>
                  <div className="u">
                    {item.unit} · {formatTaka(item.price)} each
                  </div>
                </div>
                <div className="q">×{item.quantity}</div>
                <div className="t">{formatTaka(item.lineTotal)}</div>
              </div>
            ))}
          </div>

          <div className="receipt-totals">
            <div className="sum-row">
              <span>Subtotal</span>
              <span>{formatTaka(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="sum-row discount">
                <span>Promo discount</span>
                <span>−{formatTaka(order.discount)}</span>
              </div>
            )}
            <div className="sum-row">
              <span>Delivery charge</span>
              <span className={order.deliveryFee === 0 ? "free-tag" : ""}>
                {order.deliveryFee === 0 ? "FREE" : formatTaka(order.deliveryFee)}
              </span>
            </div>
            <div className="sum-row total">
              <span>Total payable</span>
              <span>{formatTaka(order.total)}</span>
            </div>
          </div>

          <div className="receipt-foot">
            <div className="support">
              <strong>Need a hand with this order?</strong>
              Call {STORE.hotline} and quote {order.orderNumber}.
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <Link className="btn-ghost" href="/">
                Back to home
              </Link>
              <Link className="btn-green" href="/#shop">
                Continue shopping
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
