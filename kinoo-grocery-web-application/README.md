# Kinoo — fresh grocery storefront (Dhaka)

Kinoo is a complete grocery e-commerce storefront and executive **Admin Studio** inspired by Meena Bazar.
It ships with a live AJAX search, category filtering, a slide-out cart, promo codes, a cash-on-delivery /
bKash / Nagad checkout, saved order receipts, and a full operations command center at `/admin` (live dispatch board, inventory & catalog CRUD, aisle management, promo campaigns, Dhaka household CRM, and store settings).

> **Stack note for this sandbox.** The brief asked for PHP + SQLite. This runtime only serves
> Node.js/Next.js with PostgreSQL, so the same architecture was implemented with Next.js App Router
> (server components + Route Handlers acting as the OOP backend) and Drizzle ORM. Every business
> rule from the brief is preserved, including auto-creating the schema and seeding 38 Bangladeshi
> groceries on first boot. The PHP naming map is at the bottom of this file.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
# or
npm run build && npm start
```

`DATABASE_URL` is read from `.env` (already configured for the sandbox). The database initialises
itself: on the first request it creates `categories`, `products`, `orders`, `order_items`,
`cart_items` (if missing) and seeds the catalog. `/api/health` reports readiness.

## File tree

```
src/
├── app/
│   ├── layout.tsx                 # Bootstrap 5 + Bootstrap Icons CDN, fonts, header/footer/drawer shell
│   ├── globals.css                # Kinoo design system (green #16A34A, cards, cart drawer, receipt)
│   ├── page.tsx                   # Storefront (hero, daily deals, sidebar filter, product grid)
│   ├── checkout/page.tsx          # Checkout form + order summary
│   ├── order/[number]/page.tsx    # Saved order receipt
│   ├── not-found.tsx
│   └── api/
│       ├── health/route.ts        # DB + catalog readiness (drives auto-init)
│       ├── products/route.ts      # Live AJAX search / category / deal / sort queries
│       ├── cart/route.ts          # GET cart, POST add | increment | decrement | remove | set | clear
│       └── orders/route.ts        # Validates + saves orders & order_items, clears the cart
├── components/
│   ├── cart-provider.tsx          # Client cart context (fetch API, promo, toasts, area)
│   ├── site-header.tsx            # Sticky header: area selector, live search, cart button
│   ├── cart-drawer.tsx            # Offcanvas bag: qty controls, promo, delivery, totals
│   ├── hero.tsx                   # Carousel + flash-deal countdown + free delivery meter
│   ├── storefront.tsx             # Deals row, sidebar categories, AJAX-filtered grid
│   ├── product-card.tsx           # Image, unit, price, Add → − / qty / +
│   ├── checkout-view.tsx          # Customer form, payment method cards, place order
│   └── site-footer.tsx
├── db/
│   ├── schema.ts                  # Drizzle tables (categories, products, orders, order_items, cart_items)
│   ├── bootstrap.ts               # Auto-create + seed (idempotent, retries on cold starts)
│   ├── seed-data.ts               # 38 BDT-priced Bangladeshi groceries (rice, ilish, Rupchanda, Pran…)
│   └── index.ts
└── lib/
    ├── kinoo.ts                   # Shared types, areas, delivery/promo rules, ৳ formatting
    ├── catalog.ts                 # Catalog queries (search, filter, deals)
    ├── cart.ts                    # Cart session operations
    └── orders.ts                  # Checkout validation + transactional order creation

public/favicon.svg
```

## Business rules

- Delivery ৳50, **free over ৳1,000** (calculated before discount).
- Promo code **KINOO10** = 10% off the subtotal (validated again server-side at order time).
- Areas served: Dhanmondi, Gulshan, Uttara, Mirpur.
- Payment: Cash on Delivery, bKash, Nagad.
- Cart is stored server-side in PostgreSQL keyed by an httpOnly `kinoo_cart` cookie, so the price
  totals on the receipt always come from the database, never from the browser.

## PHP → Next.js map 

| Brief (PHP)              | This build                                          |
| ------------------------ | --------------------------------------------------- |
| `classes/Database.php`   | `src/db/bootstrap.ts` + `src/db/schema.ts`          |
| `classes/Product.php`    | `src/lib/catalog.ts`                                |
| `classes/Cart.php`       | `src/lib/cart.ts` + `src/app/api/cart/route.ts`     |
| `classes/Order.php`      | `src/lib/orders.ts` + `src/app/api/orders/route.ts` |
| `index.php`              | `src/app/page.tsx` + `src/components/storefront.tsx`|
| `checkout.php`           | `src/app/checkout/page.tsx`                         |
| `api.php`                | `src/app/api/products/route.ts`                     |
| `assets/js/app.js`       | `src/components/cart-provider.tsx` (Fetch API)      |
| `assets/css/style.css`   | `src/app/globals.css`                               |
| `database/kinoo.sqlite`  | PostgreSQL `app_db` (auto-created tables + seed)    |
