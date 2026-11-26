"use client";

import { useState } from "react";
import { useKinoo } from "@/components/cart-provider";
import {
  discountPercent,
  formatTaka,
  type ProductDto,
} from "@/lib/kinoo";

export function ProductCard({ product }: { product: ProductDto }) {
  const { cart, addItem, increment, decrement, busy } = useKinoo();
  const [liked, setLiked] = useState(false);

  const line = cart.items.find((item) => item.productId === product.id);
  const quantity = line?.quantity ?? 0;
  const off = discountPercent(product.price, product.oldPrice);
  const isBusy = busy === product.id;

  return (
    <article className="product-card">
      <div className="pc-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
        {product.badge && <span className="pc-badge">{product.badge}</span>}
        {off > 0 && <span className="pc-off">-{off}%</span>}
        <button
          type="button"
          className={`pc-wish ${liked ? "liked" : ""}`}
          onClick={() => setLiked((value) => !value)}
          aria-label={liked ? "Remove from wishlist" : "Save to wishlist"}
        >
          <i className={`bi ${liked ? "bi-heart-fill" : "bi-heart"}`} aria-hidden="true" />
        </button>
      </div>

      <div className="pc-body">
        <span className="pc-brand">{product.coName || "Kinoo fresh"}</span>
        <h3 className="pc-name">{product.name}</h3>
        <div className="pc-meta">
          <i className="bi bi-star-fill" aria-hidden="true" />
          <span>{product.rating.toFixed(1)}</span>
          <span className="pc-unit">{product.unit}</span>
        </div>

        <div className="pc-price-row">
          <div className="pc-price">
            <strong>{formatTaka(product.price)}</strong>
            {product.oldPrice ? <s>{formatTaka(product.oldPrice)}</s> : null}
          </div>

          {quantity === 0 ? (
            <button
              type="button"
              className="add-btn"
              disabled={isBusy || !product.inStock}
              onClick={() => void addItem(product.id, product.name)}
            >
              <i className="bi bi-plus" aria-hidden="true" />
              {product.inStock ? "ADD" : "Sold out"}
            </button>
          ) : (
            <div className={`stepper ${isBusy ? "busy" : ""}`}>
              <button
                type="button"
                onClick={() => void decrement(product.id)}
                aria-label={`Reduce ${product.name}`}
              >
                <i className="bi bi-dash" aria-hidden="true" />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => void increment(product.id)}
                aria-label={`Increase ${product.name}`}
              >
                <i className="bi bi-plus" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
