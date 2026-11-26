import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { CART_COOKIE } from "@/lib/cart";
import { CheckoutError, createOrder, type CheckoutPayload } from "@/lib/orders";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const store = await cookies();
  const sessionId = store.get(CART_COOKIE)?.value;

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "Your cart session expired. Please add items again." },
      { status: 400 },
    );
  }

  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid checkout data." }, { status: 400 });
  }

  try {
    const order = await createOrder(sessionId, payload);
    return NextResponse.json({ ok: true, ...order });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { ok: false, error: error.message, field: error.field },
        { status: 400 },
      );
    }
    console.error("POST /api/orders failed", error);
    return NextResponse.json(
      { ok: false, error: "We could not place the order. Please try again." },
      { status: 500 },
    );
  }
}
