import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminActivities,
  categories,
  orderItems,
  orders,
  products,
  promos,
  storeSettings,
} from "@/db/schema";
import { seedCategories, seedProducts } from "@/db/seed-data";

/**
 * Kinoo auto-initialisation.
 * Creates catalog, commerce and admin operations tables and seeds sample data
 * on cold starts. Safe and idempotent across concurrent requests.
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
      stock_qty integer NOT NULL DEFAULT 45,
      is_deal boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0
    )
  `);

  await db.execute(sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_qty integer NOT NULL DEFAULT 45
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
      rider_name text NOT NULL DEFAULT '',
      admin_note text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS rider_name text NOT NULL DEFAULT ''
  `);
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_note text NOT NULL DEFAULT ''
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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS promos (
      id serial PRIMARY KEY,
      code text NOT NULL UNIQUE,
      title text NOT NULL,
      discount_type text NOT NULL DEFAULT 'percent',
      discount_value integer NOT NULL DEFAULT 10,
      min_order integer NOT NULL DEFAULT 0,
      max_discount integer,
      active boolean NOT NULL DEFAULT true,
      usage_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS store_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_activities (
      id serial PRIMARY KEY,
      actor text NOT NULL DEFAULT 'Arafat Rahman',
      action text NOT NULL,
      target text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT 'system',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function seedCatalog() {
  const existingProducts = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  if ((existingProducts[0]?.count ?? 0) === 0) {
    await db.insert(categories).values(seedCategories).onConflictDoNothing();
    await db.insert(products).values(seedProducts).onConflictDoNothing();
  }

  const existingPromos = await db.select({ count: sql<number>`count(*)::int` }).from(promos);
  if ((existingPromos[0]?.count ?? 0) === 0) {
    await db
      .insert(promos)
      .values([
        {
          code: "KINOO10",
          title: "10% off welcome bag",
          discountType: "percent",
          discountValue: 10,
          minOrder: 0,
          maxDiscount: 500,
          active: true,
          usageCount: 38,
        },
        {
          code: "BAZAR150",
          title: "৳150 off big family bazar",
          discountType: "fixed",
          discountValue: 150,
          minOrder: 1500,
          maxDiscount: 150,
          active: true,
          usageCount: 19,
        },
        {
          code: "FRIDAYFRESH",
          title: "12% off Jummah fish & meat haul",
          discountType: "percent",
          discountValue: 12,
          minOrder: 900,
          maxDiscount: 350,
          active: true,
          usageCount: 14,
        },
        {
          code: "RAMADAN20",
          title: "Seasonal 20% Iftar bundle",
          discountType: "percent",
          discountValue: 20,
          minOrder: 1200,
          maxDiscount: 400,
          active: false,
          usageCount: 64,
        },
      ])
      .onConflictDoNothing();
  }

  const existingSettings = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storeSettings);
  if ((existingSettings[0]?.count ?? 0) === 0) {
    await db
      .insert(storeSettings)
      .values([
        { key: "storeName", value: "Kinoo" },
        { key: "tagline", value: "Fresh groceries, Dhaka-delivered" },
        { key: "hotline", value: "+880 9612 000 111" },
        { key: "supportEmail", value: "hello@kinoo.com.bd" },
        { key: "deliveryFee", value: "50" },
        { key: "freeDeliveryThreshold", value: "1000" },
        { key: "deliveryWindow", value: "60–90 minutes" },
        { key: "bkashMerchant", value: "01700 000 111" },
        { key: "nagadMerchant", value: "01700 000 222" },
        { key: "storeOpen", value: "true" },
        { key: "areas", value: JSON.stringify(["Dhanmondi", "Gulshan", "Uttara", "Mirpur"]) },
      ])
      .onConflictDoNothing();
  }

  const existingOrders = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
  if ((existingOrders[0]?.count ?? 0) === 0) {
    await seedSampleOrders();
  }

  const existingLogs = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminActivities);
  if ((existingLogs[0]?.count ?? 0) === 0) {
    const now = Date.now();
    await db.insert(adminActivities).values([
      {
        actor: "Arafat Rahman",
        action: "Dispatched rider Kamal Hossain for express delivery",
        target: "KIN-8M412",
        category: "order",
        createdAt: new Date(now - 14 * 60_000),
      },
      {
        actor: "Nadia Islam",
        action: "Marked Padma Hilsha (Ilish) as Today's Flash Deal",
        target: "Padma Hilsha (Ilish)",
        category: "product",
        createdAt: new Date(now - 48 * 60_000),
      },
      {
        actor: "Arafat Rahman",
        action: "Activated campaign code FRIDAYFRESH (12% off)",
        target: "FRIDAYFRESH",
        category: "promo",
        createdAt: new Date(now - 2.3 * 3_600_000),
      },
      {
        actor: "Tanvir Ahmed",
        action: "Restocked Miniket Rice (Premium) +40 bags at Naogaon dock",
        target: "Miniket Rice (Premium)",
        category: "product",
        createdAt: new Date(now - 5.1 * 3_600_000),
      },
      {
        actor: "System",
        action: "Daily 7:00 AM Dhaka haat price sync completed across 6 aisles",
        target: "37 SKUs",
        category: "system",
        createdAt: new Date(now - 8.5 * 3_600_000),
      },
    ]);
  }
}

async function seedSampleOrders() {
  const allProducts = await db.select().from(products);
  if (allProducts.length === 0) return;

  const bySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const pick = (slug: string) => bySlug.get(slug) ?? allProducts[0]!;

  const now = Date.now();
  const hrs = (h: number) => new Date(now - h * 3_600_000);

  const sampleDefs: {
    orderNumber: string;
    customerName: string;
    phone: string;
    area: string;
    address: string;
    note: string;
    paymentMethod: string;
    paymentNumber: string;
    promoCode: string;
    status: string;
    riderName: string;
    adminNote: string;
    createdAt: Date;
    lines: [slug: string, qty: number][];
  }[] = [
    {
      orderNumber: "KIN-8M491",
      customerName: "Nusrat Jahan",
      phone: "01712458910",
      area: "Dhanmondi",
      address: "House 18, Road 9/A, Dhanmondi — beside Star Kabab",
      note: "Please clean & medium-cut the ilish.",
      paymentMethod: "bkash",
      paymentNumber: "01712458910",
      promoCode: "KINOO10",
      status: "confirmed",
      riderName: "",
      adminNote: "Priority morning slot",
      createdAt: hrs(0.35),
      lines: [
        ["padma-hilsha", 1],
        ["miniket-rice", 1],
        ["deshi-onion", 2],
      ],
    },
    {
      orderNumber: "KIN-8M478",
      customerName: "Tariqul Islam",
      phone: "01819334211",
      area: "Gulshan",
      address: "Apt 6B, House 11, Road 55, Gulshan-2",
      note: "Leave with security guard at gate 2",
      paymentMethod: "nagad",
      paymentNumber: "01819334211",
      promoCode: "",
      status: "packing",
      riderName: "Rafiqul Mia",
      adminNote: "Chilled insulated box added",
      createdAt: hrs(1.1),
      lines: [
        ["galda-prawn", 2],
        ["aarong-milk", 3],
        ["farm-butter", 1],
        ["himsagar-mango", 2],
      ],
    },
    {
      orderNumber: "KIN-8M412",
      customerName: "Farhana Rahman",
      phone: "01911782345",
      area: "Uttara",
      address: "House 32, Road 14, Sector 7, Uttara",
      note: "Call when downstairs",
      paymentMethod: "cod",
      paymentNumber: "",
      promoCode: "KINOO10",
      status: "out_for_delivery",
      riderName: "Kamal Hossain",
      adminNote: "",
      createdAt: hrs(2.4),
      lines: [
        ["beef-curry-cut", 1],
        ["rupchanda-oil", 1],
        ["diamond-potato", 1],
        ["farm-eggs", 2],
      ],
    },
    {
      orderNumber: "KIN-8M365",
      customerName: "Mahmudul Hasan",
      phone: "01675891204",
      area: "Mirpur",
      address: "Flat 4A, Block C, Avenue 5, Mirpur DOHS",
      note: "",
      paymentMethod: "bkash",
      paymentNumber: "01675891204",
      promoCode: "",
      status: "delivered",
      riderName: "Sohel Rana",
      adminNote: "Delivered in 54 mins",
      createdAt: hrs(6.5),
      lines: [
        ["deshi-chicken", 1],
        ["masoor-dal", 2],
        ["ispahani-tea", 1],
        ["mishti-doi", 2],
      ],
    },
    {
      orderNumber: "KIN-8M301",
      customerName: "Nusrat Jahan",
      phone: "01712458910",
      area: "Dhanmondi",
      address: "House 18, Road 9/A, Dhanmondi — beside Star Kabab",
      note: "",
      paymentMethod: "bkash",
      paymentNumber: "01712458910",
      promoCode: "",
      status: "delivered",
      riderName: "Kamal Hossain",
      adminNote: "",
      createdAt: hrs(22),
      lines: [
        ["himsagar-mango", 3],
        ["aarong-milk", 2],
        ["potata-biscuit", 2],
      ],
    },
    {
      orderNumber: "KIN-8M259",
      customerName: "Shafiqur Chowdhury",
      phone: "01755609812",
      area: "Gulshan",
      address: "House 4, Road 104, Gulshan-2 — near Lake Park",
      note: "Halal curry cut medium pieces",
      paymentMethod: "cod",
      paymentNumber: "",
      promoCode: "BAZAR150",
      status: "delivered",
      riderName: "Rafiqul Mia",
      adminNote: "VIP repeat household",
      createdAt: hrs(30),
      lines: [
        ["padma-hilsha", 1],
        ["beef-curry-cut", 1],
        ["pran-milk-powder", 1],
      ],
    },
    {
      orderNumber: "KIN-8M198",
      customerName: "Rubaiya Sultana",
      phone: "01314908721",
      area: "Uttara",
      address: "House 9, Road 7, Sector 4, Uttara",
      note: "",
      paymentMethod: "nagad",
      paymentNumber: "01314908721",
      promoCode: "KINOO10",
      status: "delivered",
      riderName: "Jahangir Alam",
      adminNote: "",
      createdAt: hrs(51),
      lines: [
        ["miniket-rice", 2],
        ["rupchanda-oil", 1],
        ["rin-washing-powder", 2],
        ["vim-dish-liquid", 1],
      ],
    },
    {
      orderNumber: "KIN-8M144",
      customerName: "Tanvir Kabir",
      phone: "01798112233",
      area: "Dhanmondi",
      address: "House 41, Road 4, Dhanmondi",
      note: "",
      paymentMethod: "cod",
      paymentNumber: "",
      promoCode: "",
      status: "delivered",
      riderName: "Kamal Hossain",
      adminNote: "",
      createdAt: hrs(76),
      lines: [
        ["rui-fish", 2],
        ["fresh-tomato", 2],
        ["leafy-combo", 2],
        ["radhuni-turmeric", 1],
      ],
    },
    {
      orderNumber: "KIN-8M092",
      customerName: "Samia Afrin",
      phone: "01841229090",
      area: "Mirpur",
      address: "House 15, Lane 3, Senpara Parbata, Mirpur-10",
      note: "Customer requested reschedule then cancelled",
      paymentMethod: "cod",
      paymentNumber: "",
      promoCode: "",
      status: "cancelled",
      riderName: "",
      adminNote: "Cancelled prior to dispatch",
      createdAt: hrs(98),
      lines: [
        ["farm-chicken", 2],
        ["bashundhara-atta", 1],
      ],
    },
    {
      orderNumber: "KIN-8M051",
      customerName: "Shafiqur Chowdhury",
      phone: "01755609812",
      area: "Gulshan",
      address: "House 4, Road 104, Gulshan-2 — near Lake Park",
      note: "",
      paymentMethod: "bkash",
      paymentNumber: "01755609812",
      promoCode: "KINOO10",
      status: "delivered",
      riderName: "Rafiqul Mia",
      adminNote: "",
      createdAt: hrs(124),
      lines: [
        ["galda-prawn", 2],
        ["deshi-chicken", 1],
        ["mango-juice", 2],
        ["harpic-cleaner", 1],
      ],
    },
    {
      orderNumber: "KIN-8M019",
      customerName: "Ariful Haque",
      phone: "01521445566",
      area: "Uttara",
      address: "House 21, Road 18, Sector 11, Uttara",
      note: "",
      paymentMethod: "cod",
      paymentNumber: "",
      promoCode: "",
      status: "delivered",
      riderName: "Jahangir Alam",
      adminNote: "",
      createdAt: hrs(146),
      lines: [
        ["farm-eggs", 2],
        ["sagor-banana", 2],
        ["maggi-noodles", 2],
        ["ispahani-tea", 1],
      ],
    },
  ];

  for (const def of sampleDefs) {
    const builtItems = def.lines.map(([slug, qty]) => {
      const p = pick(slug);
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        imageUrl: p.imageUrl,
        price: p.price,
        quantity: qty,
        lineTotal: p.price * qty,
      };
    });

    const subtotal = builtItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discount =
      def.promoCode === "KINOO10"
        ? Math.round(subtotal * 0.1)
        : def.promoCode === "BAZAR150"
          ? 150
          : 0;
    const deliveryFee = subtotal >= 1000 ? 0 : 50;
    const total = Math.max(subtotal - discount + deliveryFee, 0);

    const existing = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, def.orderNumber))
      .limit(1);

    if (existing.length > 0) continue;

    const [created] = await db
      .insert(orders)
      .values({
        orderNumber: def.orderNumber,
        customerName: def.customerName,
        phone: def.phone,
        area: def.area,
        address: def.address,
        note: def.note,
        paymentMethod: def.paymentMethod,
        paymentNumber: def.paymentNumber,
        promoCode: def.promoCode,
        subtotal,
        discount,
        deliveryFee,
        total,
        status: def.status,
        riderName: def.riderName,
        adminNote: def.adminNote,
        createdAt: def.createdAt,
      })
      .returning();

    if (created) {
      await db.insert(orderItems).values(
        builtItems.map((item) => ({
          ...item,
          orderId: created.id,
        })),
      );
    }
  }
}

async function runInit() {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await createSchema();
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
