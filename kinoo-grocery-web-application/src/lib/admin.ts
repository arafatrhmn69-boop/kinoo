import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import {
  adminActivities,
  categories,
  orderItems,
  orders,
  products,
  promos,
  storeSettings,
} from "@/db/schema";
import {
  DHAKA_RIDERS,
  ORDER_STATUSES,
  type AdminActivityDto,
  type AdminCategoryDto,
  type AdminCustomerDto,
  type AdminDashboardDto,
  type AdminOrderDto,
  type AdminOrderItem,
  type AdminProductDto,
  type AdminPromoDto,
  type OrderStatus,
} from "@/lib/admin-types";

export {
  DHAKA_RIDERS,
  ORDER_STATUSES,
  type AdminActivityDto,
  type AdminCategoryDto,
  type AdminCustomerDto,
  type AdminDashboardDto,
  type AdminOrderDto,
  type AdminOrderItem,
  type AdminProductDto,
  type AdminPromoDto,
  type OrderStatus,
};

export async function logAdminActivity(
  action: string,
  target = "",
  category = "system",
  actor = "Arafat Rahman",
) {
  await ensureDatabase();
  await db.insert(adminActivities).values({
    actor,
    action,
    target,
    category,
  });
}

export async function getAdminOrders(): Promise<AdminOrderDto[]> {
  await ensureDatabase();
  const orderRows = await db.select().from(orders).orderBy(desc(orders.createdAt), desc(orders.id));
  if (orderRows.length === 0) return [];

  const orderIds = orderRows.map((o) => o.id);
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));

  const itemsByOrder = new Map<number, AdminOrderItem[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({
      id: row.id,
      productId: row.productId,
      name: row.name,
      unit: row.unit,
      imageUrl: row.imageUrl,
      price: row.price,
      quantity: row.quantity,
      lineTotal: row.lineTotal,
    });
    itemsByOrder.set(row.orderId, list);
  }

  return orderRows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customerName,
    phone: o.phone,
    area: o.area,
    address: o.address,
    note: o.note,
    paymentMethod: o.paymentMethod,
    paymentNumber: o.paymentNumber,
    promoCode: o.promoCode,
    subtotal: o.subtotal,
    discount: o.discount,
    deliveryFee: o.deliveryFee,
    total: o.total,
    status: o.status,
    riderName: o.riderName,
    adminNote: o.adminNote,
    createdAt: o.createdAt.toISOString(),
    items: itemsByOrder.get(o.id) ?? [],
  }));
}

export async function getAdminProducts(): Promise<AdminProductDto[]> {
  await ensureDatabase();
  const [productRows, salesAgg] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id)),
    db
      .select({
        productId: orderItems.productId,
        soldCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`,
        revenue: sql<number>`coalesce(sum(${orderItems.lineTotal}), 0)::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(sql`${orders.status} != 'cancelled'`)
      .groupBy(orderItems.productId),
  ]);

  const salesMap = new Map(
    salesAgg.map((s) => [s.productId, { soldCount: Number(s.soldCount), revenue: Number(s.revenue) }]),
  );

  return productRows.map((p) => {
    const stat = salesMap.get(p.id) ?? { soldCount: 0, revenue: 0 };
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      coName: p.coName,
      categorySlug: p.categorySlug,
      unit: p.unit,
      price: p.price,
      oldPrice: p.oldPrice,
      imageUrl: p.imageUrl,
      description: p.description,
      badge: p.badge,
      rating: p.rating,
      inStock: p.inStock,
      stockQty: p.stockQty,
      isDeal: p.isDeal,
      sortOrder: p.sortOrder,
      soldCount: stat.soldCount,
      revenue: stat.revenue,
    };
  });
}

export async function getAdminCategories(
  productList?: AdminProductDto[],
): Promise<AdminCategoryDto[]> {
  await ensureDatabase();
  const prods = productList ?? (await getAdminProducts());
  const catRows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));

  return catRows.map((c) => {
    const matching = prods.filter((p) => p.categorySlug === c.slug);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      blurb: c.blurb,
      icon: c.icon,
      sortOrder: c.sortOrder,
      productCount: matching.length,
      revenue: matching.reduce((sum, p) => sum + p.revenue, 0),
    };
  });
}

export async function getAdminPromos(): Promise<AdminPromoDto[]> {
  await ensureDatabase();
  const rows = await db.select().from(promos).orderBy(desc(promos.active), asc(promos.id));
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    discountType: r.discountType,
    discountValue: r.discountValue,
    minOrder: r.minOrder,
    maxDiscount: r.maxDiscount,
    active: r.active,
    usageCount: r.usageCount,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getAdminSettings(): Promise<Record<string, string>> {
  await ensureDatabase();
  const rows = await db.select().from(storeSettings);
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function getAdminActivities(limit = 30): Promise<AdminActivityDto[]> {
  await ensureDatabase();
  const rows = await db
    .select()
    .from(adminActivities)
    .orderBy(desc(adminActivities.createdAt), desc(adminActivities.id))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    target: r.target,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function deriveCustomers(orderList: AdminOrderDto[]): AdminCustomerDto[] {
  const byPhone = new Map<
    string,
    {
      phone: string;
      name: string;
      area: string;
      address: string;
      orderCount: number;
      totalSpent: number;
      lastOrderAt: string;
      lastOrderNumber: string;
      payments: Record<string, number>;
      orders: AdminCustomerDto["orders"];
    }
  >();

  for (const order of orderList) {
    const existing = byPhone.get(order.phone);
    const validSpend = order.status !== "cancelled" ? order.total : 0;
    const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

    if (!existing) {
      byPhone.set(order.phone, {
        phone: order.phone,
        name: order.customerName,
        area: order.area,
        address: order.address,
        orderCount: 1,
        totalSpent: validSpend,
        lastOrderAt: order.createdAt,
        lastOrderNumber: order.orderNumber,
        payments: { [order.paymentMethod]: 1 },
        orders: [
          {
            orderNumber: order.orderNumber,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            itemCount,
          },
        ],
      });
    } else {
      existing.orderCount += 1;
      existing.totalSpent += validSpend;
      existing.payments[order.paymentMethod] =
        (existing.payments[order.paymentMethod] ?? 0) + 1;
      existing.orders.push({
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
        itemCount,
      });
      if (new Date(order.createdAt).getTime() > new Date(existing.lastOrderAt).getTime()) {
        existing.lastOrderAt = order.createdAt;
        existing.lastOrderNumber = order.orderNumber;
        existing.name = order.customerName;
        existing.area = order.area;
        existing.address = order.address;
      }
    }
  }

  return Array.from(byPhone.values())
    .map((c) => {
      const preferredPayment =
        Object.entries(c.payments).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "cod";
      return {
        phone: c.phone,
        name: c.name,
        area: c.area,
        address: c.address,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
        lastOrderAt: c.lastOrderAt,
        lastOrderNumber: c.lastOrderNumber,
        preferredPayment,
        orders: c.orders,
      };
    })
    .sort((a, b) => b.totalSpent - a.totalSpent);
}

export async function getAdminDashboard(): Promise<AdminDashboardDto> {
  await ensureDatabase();

  const [orderList, productList, promoList, settings, activities] = await Promise.all([
    getAdminOrders(),
    getAdminProducts(),
    getAdminPromos(),
    getAdminSettings(),
    getAdminActivities(25),
  ]);

  const categoryList = await getAdminCategories(productList);
  const customers = deriveCustomers(orderList);

  const validOrders = orderList.filter((o) => o.status !== "cancelled");
  const grossRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const last24hCutoff = now.getTime() - 24 * 3_600_000;

  const todayRevenue = validOrders
    .filter((o) => new Date(o.createdAt).getTime() >= last24hCutoff)
    .reduce((sum, o) => sum + o.total, 0);

  const statusCounts: Record<string, number> = {
    confirmed: 0,
    packing: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const o of orderList) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }

  const activeOrders =
    (statusCounts.confirmed ?? 0) +
    (statusCounts.packing ?? 0) +
    (statusCounts.out_for_delivery ?? 0);
  const deliveredOrders = statusCounts.delivered ?? 0;
  const cancelledOrders = statusCounts.cancelled ?? 0;
  const avgOrderValue =
    validOrders.length > 0 ? Math.round(grossRevenue / validOrders.length) : 0;
  const fulfillmentRate =
    orderList.length > 0
      ? Math.round(((orderList.length - cancelledOrders) / orderList.length) * 100)
      : 100;

  const lowStockCount = productList.filter(
    (p) => p.inStock && p.stockQty > 0 && p.stockQty <= 15,
  ).length;
  const outOfStockCount = productList.filter((p) => !p.inStock || p.stockQty <= 0).length;
  const dealsCount = productList.filter((p) => p.isDeal).length;

  // 7-day revenue series
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const shortDay = new Intl.DateTimeFormat("en-US", { weekday: "short" });

  const revenueSeries: AdminDashboardDto["revenueSeries"] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayOrders = validOrders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });

    revenueSeries.push({
      date: dayFormatter.format(dayStart),
      label: i === 0 ? "Today" : shortDay.format(dayStart),
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
      orders: dayOrders.length,
    });
  }

  // Area breakdown
  const areaMap = new Map<string, { orders: number; revenue: number }>();
  for (const area of ["Dhanmondi", "Gulshan", "Uttara", "Mirpur"]) {
    areaMap.set(area, { orders: 0, revenue: 0 });
  }
  for (const o of validOrders) {
    const entry = areaMap.get(o.area) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += o.total;
    areaMap.set(o.area, entry);
  }
  const areaBreakdown = Array.from(areaMap.entries())
    .map(([area, stat]) => ({
      area,
      orders: stat.orders,
      revenue: stat.revenue,
      share: grossRevenue > 0 ? Math.round((stat.revenue / grossRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Payment breakdown
  const payLabels: Record<string, string> = {
    cod: "Cash on Delivery",
    bkash: "bKash Wallet",
    nagad: "Nagad Wallet",
  };
  const payMap = new Map<string, { orders: number; revenue: number }>();
  for (const key of ["cod", "bkash", "nagad"]) {
    payMap.set(key, { orders: 0, revenue: 0 });
  }
  for (const o of validOrders) {
    const entry = payMap.get(o.paymentMethod) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += o.total;
    payMap.set(o.paymentMethod, entry);
  }
  const paymentBreakdown = Array.from(payMap.entries()).map(([method, stat]) => ({
    method,
    label: payLabels[method] ?? method,
    orders: stat.orders,
    revenue: stat.revenue,
    share: validOrders.length > 0 ? Math.round((stat.orders / validOrders.length) * 100) : 0,
  }));

  return {
    metrics: {
      grossRevenue,
      todayRevenue,
      totalOrders: orderList.length,
      activeOrders,
      deliveredOrders,
      cancelledOrders,
      avgOrderValue,
      fulfillmentRate,
      totalProducts: productList.length,
      lowStockCount,
      outOfStockCount,
      dealsCount,
      uniqueCustomers: customers.length,
      repeatCustomers: customers.filter((c) => c.orderCount > 1).length,
    },
    revenueSeries,
    areaBreakdown,
    paymentBreakdown,
    statusCounts,
    orders: orderList,
    products: productList,
    categories: categoryList,
    promos: promoList,
    customers,
    activities,
    settings,
  };
}
