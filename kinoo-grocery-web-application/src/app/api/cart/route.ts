import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import {
  CART_COOKIE,
  addToCart,
  clearCart,
  getCart,
  removeFromCart,
  setQuantity,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

async function resolveSession() {
  const store = await cookies();
  const existing = store.get(CART_COOKIE)?.value;
  return { sessionId: existing ?? crypto.randomUUID(), isNew: !existing };
}

function respond(payload: unknown, sessionId: string, isNew: boolean, status = 200) {
  const response = NextResponse.json(payload, { status });
  if (isNew) {
    response.cookies.set({ name: CART_COOKIE, value: sessionId, ...COOKIE_OPTIONS });
  }
  return response;
}

export async function GET() {
  const { sessionId, isNew } = await resolveSession();
  try {
    const cart = await getCart(sessionId);
    return respond({ ok: true, cart }, sessionId, isNew);
  } catch (error) {
    console.error("GET /api/cart failed", error);
    return respond({ ok: false, error: "Could not load your cart." }, sessionId, isNew, 500);
  }
}

type CartBody = {
  action?: string;
  productId?: number;
  quantity?: number;
};

export async function POST(request: NextRequest) {
  const { sessionId, isNew } = await resolveSession();

  let body: CartBody;
  try {
    body = (await request.json()) as CartBody;
  } catch {
    return respond({ ok: false, error: "Invalid request body." }, sessionId, isNew, 400);
  }

  const productId = Number(body.productId);
  const action = body.action ?? "add";

  try {
    if (action === "clear") {
      await clearCart(sessionId);
    } else {
      if (!Number.isFinite(productId) || productId <= 0) {
        return respond({ ok: false, error: "Unknown product." }, sessionId, isNew, 400);
      }

      if (action === "add") {
        await addToCart(sessionId, productId, Number(body.quantity) || 1);
      } else if (action === "increment") {
        await addToCart(sessionId, productId, 1);
      } else if (action === "decrement") {
        const cart = await getCart(sessionId);
        const line = cart.items.find((item) => item.productId === productId);
        await setQuantity(sessionId, productId, (line?.quantity ?? 1) - 1);
      } else if (action === "set") {
        await setQuantity(sessionId, productId, Number(body.quantity) || 0);
      } else if (action === "remove") {
        await removeFromCart(sessionId, productId);
      } else {
        return respond({ ok: false, error: "Unsupported cart action." }, sessionId, isNew, 400);
      }
    }

    const cart = await getCart(sessionId);
    return respond({ ok: true, cart }, sessionId, isNew);
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
      return respond({ ok: false, error: "That product is out of stock." }, sessionId, isNew, 404);
    }
    console.error("POST /api/cart failed", error);
    return respond({ ok: false, error: "Could not update your cart." }, sessionId, isNew, 500);
  }
}
