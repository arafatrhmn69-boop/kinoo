import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { cartItems, products } from "@/db/schema";
import type { CartDto, CartLineDto } from "@/lib/kinoo";

export const CART_COOKIE = "kinoo_cart";
export const MAX_QUANTITY = 20;

export async function getCart(sessionId: string): Promise<CartDto> {
  await ensureDatabase();

  const rows = await db
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      unit: products.unit,
      imageUrl: products.imageUrl,
      price: products.price,
      oldPrice: products.oldPrice,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.sessionId, sessionId))
    .orderBy(asc(cartItems.id));

  const items: CartLineDto[] = rows.map((row) => ({
    ...row,
    lineTotal: row.price * row.quantity,
  }));

  return {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

export async function addToCart(
  sessionId: string,
  productId: number,
  quantity = 1,
): Promise<void> {
  await ensureDatabase();
  const product = await db
    .select({ id: products.id, inStock: products.inStock })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  const found = product[0];
  if (!found || !found.inStock) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  const amount = Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_QUANTITY);

  await db
    .insert(cartItems)
    .values({ sessionId, productId, quantity: amount })
    .onConflictDoUpdate({
      target: [cartItems.sessionId, cartItems.productId],
      set: {
        quantity: sql`least(${cartItems.quantity} + ${amount}, ${MAX_QUANTITY})`,
      },
    });
}

export async function setQuantity(
  sessionId: string,
  productId: number,
  quantity: number,
): Promise<void> {
  await ensureDatabase();

  if (quantity <= 0) {
    await removeFromCart(sessionId, productId);
    return;
  }

  const amount = Math.min(Math.trunc(quantity), MAX_QUANTITY);
  await db
    .update(cartItems)
    .set({ quantity: amount })
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)));
}

export async function removeFromCart(sessionId: string, productId: number): Promise<void> {
  await ensureDatabase();
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.sessionId, sessionId), eq(cartItems.productId, productId)));
}

export async function clearCart(sessionId: string): Promise<void> {
  await ensureDatabase();
  await db.delete(cartItems).where(eq(cartItems.sessionId, sessionId));
}
