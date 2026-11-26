import { sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { seedCategories, seedProducts } from "@/db/seed-data";

/**
 * Kinoo auto-initialisation.
 * Mirrors the PHP `Database` class described in the brief: on first boot the
 * schema is created and the Bangladeshi grocery catalog is seeded. Every entry
 * point can call `ensureDatabase()` — it is idempotent, self-healing and safe
 * when several requests (or server workers) hit a cold database together.
 */
let initPromise: Promise<void> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function createSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS categories (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      blurb text NOT NULL DEFAULT '',
      icon text NOT NULL DEFAULT '🛒',
      sort_order integer NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS products (
      id serial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      co_name text NOT NULL DEFAULT '',
      category_slug text NOT NULL,
      unit text NOT NULL,
      price integer NOT NULL,
      old_price integer,
      image_url text NOT NULL,
      description text NOT NULL DEFAULT '',
      badge text,
      rating real NOT NULL DEFAULT 4.6,
      in_stock boolean NOT NULL DEFAULT true,
      is_deal boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id serial PRIMARY KEY,
      order_number text NOT NULL UNIQUE,
      customer_name text NOT NULL,
      phone text NOT NULL,
      area text NOT NULL,
      address text NOT NULL,
      note text NOT NULL DEFAULT '',
      payment_method text NOT NULL DEFAULT 'cod',
      payment_number text NOT NULL DEFAULT '',
      promo_code text NOT NULL DEFAULT '',
      subtotal integer NOT NULL,
      discount integer NOT NULL DEFAULT 0,
      delivery_fee integer NOT NULL DEFAULT 0,
      total integer NOT NULL,
      status text NOT NULL DEFAULT 'confirmed',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id serial PRIMARY KEY,
      order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id integer NOT NULL,
      name text NOT NULL,
      unit text NOT NULL,
      image_url text NOT NULL DEFAULT '',
      price integer NOT NULL,
      quantity integer NOT NULL,
      line_total integer NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cart_items (
      id serial PRIMARY KEY,
      session_id text NOT NULL,
      product_id integer NOT NULL,
      quantity integer NOT NULL DEFAULT 1,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS cart_items_session_product_idx
    ON cart_items (session_id, product_id)
  `);
}

async function schemaReady(): Promise<boolean> {
  const result = await db.execute(sql`
    select to_regclass('public.products') is not null as ready
  `);
  const rows = result.rows as { ready: boolean }[];
  return Boolean(rows[0]?.ready);
}

async function seedCatalog() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  if ((existing[0]?.count ?? 0) > 0) return;

  await db.insert(categories).values(seedCategories).onConflictDoNothing();
  await db.insert(products).values(seedProducts).onConflictDoNothing();
}

async function runInit() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      if (!(await schemaReady())) {
        await createSchema();
      }
      await seedCatalog();
      return;
    } catch (error) {
      lastError = error;
      await sleep(180 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Kinoo database initialisation failed");
}

export function ensureDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = runInit().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
}
