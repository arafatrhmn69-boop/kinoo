import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { cartItems, orderItems, orders } from "@/db/schema";
import { getCart } from "@/lib/cart";
import {
  STORE,
  deliveryFeeFor,
  discountFor,
  formatTaka,
  normalisePromo,
  type Area,
  type PaymentMethod,
} from "@/lib/kinoo";

export type CheckoutPayload = {
  customerName?: string;
  phone?: string;
  area?: string;
  address?: string;
  note?: string;
  paymentMethod?: string;
  paymentNumber?: string;
  promoCode?: string;
};

export type OrderItemRow = {
  id: number;
  productId: number;
  name: string;
  unit: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type OrderRecord = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  area: string;
  address: string;
  note: string;
  paymentMethod: string;
  paymentNumber: string;
  promoCode: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: Date;
  items: OrderItemRow[];
};

export class CheckoutError extends Error {
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "CheckoutError";
    this.field = field;
  }
}

function cleanupPhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^\+?88/, "");
}

function validate(payload: CheckoutPayload) {
  const customerName = (payload.customerName ?? "").trim();
  if (customerName.length < 3) {
    throw new CheckoutError("Please enter your full name (at least 3 characters).", "customerName");
  }

  const phone = cleanupPhone(payload.phone ?? "");
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw new CheckoutError("Enter a valid 11-digit Bangladeshi mobile number.", "phone");
  }

  const area = (payload.area ?? "").trim();
  if (!STORE.areas.includes(area as Area)) {
    throw new CheckoutError("Choose a delivery area inside Dhaka.", "area");
  }

  const address = (payload.address ?? "").trim();
  if (address.length < 10) {
    throw new CheckoutError("Add a full address — house, road and landmark.", "address");
  }

  const paymentMethod = (payload.paymentMethod ?? "cod").trim() as PaymentMethod;
  if (!STORE.paymentMethods.some((method) => method.value === paymentMethod)) {
    throw new CheckoutError("Choose a supported payment method.", "paymentMethod");
  }

  const paymentNumber = cleanupPhone(payload.paymentNumber ?? "");
  if (paymentMethod !== "cod" && paymentNumber && !/^01[3-9]\d{8}$/.test(paymentNumber)) {
    throw new CheckoutError("That mobile banking number does not look right.", "paymentNumber");
  }

  return {
    customerName,
    phone,
    area,
    address,
    note: (payload.note ?? "").trim().slice(0, 400),
    paymentMethod,
    paymentNumber: paymentMethod === "cod" ? "" : paymentNumber,
    promoCode: normalisePromo(payload.promoCode),
  };
}

function buildOrderNumber(): string {
  const stamp = Date.now().toString(36).slice(-5).toUpperCase();
  const random = Math.floor(100 + Math.random() * 899);
  return `KIN-${stamp}${random}`;
}

export async function createOrder(sessionId: string, payload: CheckoutPayload) {
  const customer = validate(payload);
  const cart = await getCart(sessionId);

  if (cart.items.length === 0) {
    throw new CheckoutError("Your cart is empty. Add a few groceries first.", "cart");
  }

  const subtotal = cart.subtotal;
  const discount = discountFor(subtotal, customer.promoCode);
  const deliveryFee = deliveryFeeFor(subtotal);
  const total = Math.max(subtotal - discount + deliveryFee, 0);
  const orderNumber = buildOrderNumber();

  const saved = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerName: customer.customerName,
        phone: customer.phone,
        area: customer.area,
        address: customer.address,
        note: customer.note,
        paymentMethod: customer.paymentMethod,
        paymentNumber: customer.paymentNumber,
        promoCode: customer.promoCode,
        subtotal,
        discount,
        deliveryFee,
        total,
        status: "confirmed",
      })
      .returning();

    await tx.insert(orderItems).values(
      cart.items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        name: item.name,
        unit: item.unit,
        imageUrl: item.imageUrl,
        price: item.price,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
      })),
    );

    await tx.delete(cartItems).where(eq(cartItems.sessionId, sessionId));

    return order;
  });

  return {
    orderNumber: saved.orderNumber,
    subtotal,
    discount,
    deliveryFee,
    total,
    summary: formatTaka(total),
  };
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
  await ensureDatabase();

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.id));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    phone: order.phone,
    area: order.area,
    address: order.address,
    note: order.note,
    paymentMethod: order.paymentMethod,
    paymentNumber: order.paymentNumber,
    promoCode: order.promoCode,
    subtotal: order.subtotal,
    discount: order.discount,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status,
    createdAt: order.createdAt,
    items,
  };
}
