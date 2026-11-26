"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useKinoo } from "@/components/cart-provider";
import {
  STORE,
  deliveryFeeFor,
  discountFor,
  formatTaka,
} from "@/lib/kinoo";

export function CartDrawer() {
  const {
    cart,
    isOpen,
    closeCart,
    busy,
    promo,
    applyPromo,
    clearPromo,
    increment,
    decrement,
    removeItem,
    openCart,
  } = useKinoo();
  const [code, setCode] = useState(promo);
  const pathname = usePathname();

  useEffect(() => {
    setCode(promo);
  }, [promo]);

  const discount = discountFor(cart.subtotal, promo);
  const delivery = deliveryFeeFor(cart.subtotal);
  const total = Math.max(cart.subtotal - discount + delivery, 0);
  const remaining = Math.max(STORE.freeDeliveryThreshold - cart.subtotal, 0);
  const progress = Math.min((cart.subtotal / STORE.freeDeliveryThreshold) * 100, 100);

  return (
    <>
      <div
        className={`cart-backdrop ${isOpen ? "open" : ""}`}
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside
        className={`cart-drawer ${isOpen ? "open" : ""}`}
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
      >
        <div className="cd-head">
          <h2>
            <i className="bi bi-bag-check" style={{ color: "#16a34a" }} aria-hidden="true" />
            Your bag
            <span className="cd-count">{cart.count} items</span>
          </h2>
          <button type="button" className="icon-close" onClick={closeCart} aria-label="Close cart">
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="delivery-progress">
          {remaining > 0 ? (
            <p>
              Add {formatTaka(remaining)} more for <strong>free delivery</strong>
            </p>
          ) : (
            <p>
              <i className="bi bi-truck" aria-hidden="true" /> You unlocked free delivery — nice!
            </p>
          )}
          <div className="dp-bar">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="cd-body">
          {cart.items.length === 0 ? (
            <div className="cart-empty">
              <i className="bi bi-basket" aria-hidden="true" />
              <h3>Your bag is empty</h3>
              <p>Fresh vegetables, ilish and warm ruti are only a tap away.</p>
              <button type="button" className="btn-green" onClick={closeCart}>
                Start shopping
                <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </div>
          ) : (
            cart.items.map((item) => (
              <div className="cart-line" key={item.productId}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} loading="lazy" />
                <div>
                  <div className="cl-name">{item.name}</div>
                  <div className="cl-unit">
                    {item.unit} · {formatTaka(item.price)}
                  </div>
                  <div className="cl-controls">
                    <div className={`qty-mini ${busy === item.productId ? "busy" : ""}`}>
                      <button
                        type="button"
                        onClick={() => void decrement(item.productId)}
                        aria-label={`Reduce ${item.name} quantity`}
                      >
                        <i className="bi bi-dash" aria-hidden="true" />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => void increment(item.productId)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <i className="bi bi-plus" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="cl-price">{formatTaka(item.lineTotal)}</div>
                <button
                  type="button"
                  className="cl-remove"
                  onClick={() => void removeItem(item.productId)}
                  aria-label={`Remove ${item.name}`}
                >
                  <i className="bi bi-trash3" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="cd-foot">
            <div className="promo-row">
              <input
                type="text"
                placeholder="Promo code (KINOO10)"
                aria-label="Promo code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              {promo ? (
                <button type="button" onClick={clearPromo}>
                  Remove
                </button>
              ) : (
                <button type="button" onClick={() => applyPromo(code)}>
                  Apply
                </button>
              )}
            </div>
            <div className={`promo-note ${promo ? "ok" : ""}`}>
              {promo ? (
                <span>
                  <i className="bi bi-patch-check-fill" aria-hidden="true" /> {promo} · 10% off
                </span>
              ) : (
                <span>Try KINOO10 for 10% off your first bag</span>
              )}
              <span>Delivery {formatTaka(STORE.deliveryFee)}</span>
            </div>

            <div className="sum-row">
              <span>Subtotal ({cart.count} items)</span>
              <span>{formatTaka(cart.subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="sum-row discount">
                <span>Promo discount</span>
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

            <Link className="btn-green btn-checkout" href="/checkout" onClick={closeCart}>
              Proceed to checkout
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
            <div className="cd-secure">
              <i className="bi bi-shield-lock" aria-hidden="true" />
              Secure checkout · Cash on delivery, bKash &amp; Nagad
            </div>
          </div>
        )}
      </aside>

      {cart.count > 0 && !isOpen && pathname === "/" && (
        <div className="mobile-cart-bar">
          <div>
            <span className="mcb-total">{formatTaka(total)}</span>
            <small>{cart.count} items in bag</small>
          </div>
          <button type="button" className="btn-green" onClick={openCart}>
            <i className="bi bi-bag-check" aria-hidden="true" />
            View bag
          </button>
        </div>
      )}
    </>
  );
}
