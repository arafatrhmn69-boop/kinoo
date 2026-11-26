import Link from "next/link";
import { NAV_CATEGORIES, STORE } from "@/lib/kinoo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="k-container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <span className="brand-mark">
                <i className="bi bi-basket2-fill" aria-hidden="true" />
              </span>
              <strong>
                Kin<span>oo</span>
              </strong>
            </div>
            <p className="footer-about">
              Kinoo is Dhaka&apos;s neighbourhood bazar in your pocket. We hand-pick from local
              haats, weigh it fresh and ride it to your door in 60–90 minutes.
            </p>
            <p className="footer-about" style={{ marginTop: 10 }}>
              <i className="bi bi-geo-alt" aria-hidden="true" /> Serving {STORE.areas.join(" · ")}
            </p>
          </div>

          <div>
            <h4>Shop by aisle</h4>
            <ul>
              {NAV_CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link href={`/?category=${category.slug}#shop`}>{category.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Help</h4>
            <ul>
              <li>
                <Link href="/#deals">Daily deals</Link>
              </li>
              <li>
                <Link href="/checkout">Checkout</Link>
              </li>
              <li>Delivery areas</li>
              <li>Returns &amp; refunds</li>
              <li>Privacy policy</li>
            </ul>
          </div>

          <div>
            <h4>Talk to Kinoo</h4>
            <ul>
              <li>
                <i className="bi bi-telephone" aria-hidden="true" /> {STORE.hotline}
              </li>
              <li>
                <i className="bi bi-envelope" aria-hidden="true" /> hello@kinoo.com.bd
              </li>
              <li>
                <i className="bi bi-clock" aria-hidden="true" /> Daily, 7 am – 11 pm
              </li>
              <li>
                <i className="bi bi-truck" aria-hidden="true" /> ৳{STORE.deliveryFee} delivery · free
                over ৳{STORE.freeDeliveryThreshold}
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Kinoo Bazar Ltd. Made fresh in Dhaka.</span>
          <div className="pay-badges">
            <span>Cash on delivery</span>
            <span>bKash</span>
            <span>Nagad</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
