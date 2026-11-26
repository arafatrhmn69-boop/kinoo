import {
  boolean,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Kinoo catalog + commerce + admin operations schema.
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  blurb: text("blurb").notNull().default(""),
  icon: text("icon").notNull().default("🛒"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  coName: text("co_name").notNull().default(""),
  categorySlug: text("category_slug").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  oldPrice: integer("old_price"),
  imageUrl: text("image_url").notNull(),
  description: text("description").notNull().default(""),
  badge: text("badge"),
  rating: real("rating").notNull().default(4.6),
  inStock: boolean("in_stock").notNull().default(true),
  stockQty: integer("stock_qty").notNull().default(45),
  isDeal: boolean("is_deal").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  area: text("area").notNull(),
  address: text("address").notNull(),
  note: text("note").notNull().default(""),
  paymentMethod: text("payment_method").notNull().default("cod"),
  paymentNumber: text("payment_number").notNull().default(""),
  promoCode: text("promo_code").notNull().default(""),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("confirmed"),
  riderName: text("rider_name").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    productId: integer("product_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cart_items_session_product_idx").on(table.sessionId, table.productId)],
);

export const promos = pgTable("promos", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  discountType: text("discount_type").notNull().default("percent"), // 'percent' | 'fixed'
  discountValue: integer("discount_value").notNull().default(10),
  minOrder: integer("min_order").notNull().default(0),
  maxDiscount: integer("max_discount"),
  active: boolean("active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storeSettings = pgTable("store_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminActivities = pgTable("admin_activities", {
  id: serial("id").primaryKey(),
  actor: text("actor").notNull().default("Arafat Rahman"),
  action: text("action").notNull(),
  target: text("target").notNull().default(""),
  category: text("category").notNull().default("system"), // 'order' | 'product' | 'category' | 'promo' | 'settings'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
