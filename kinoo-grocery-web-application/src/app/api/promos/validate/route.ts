import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { promos } from "@/db/schema";
import { normalisePromo } from "@/lib/kinoo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureDatabase();

  const code = normalisePromo(request.nextUrl.searchParams.get("code"));
  const subtotal = Math.max(Number(request.nextUrl.searchParams.get("subtotal")) || 0, 0);

  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter a promo code." }, { status: 400 });
  }

  try {
    const [row] = await db.select().from(promos).where(eq(promos.code, code)).limit(1);
    if (!row || !row.active) {
      return NextResponse.json(
        { ok: false, error: "That promo code is not valid or currently paused." },
        { status: 404 },
      );
    }

    if (subtotal > 0 && subtotal < row.minOrder) {
      return NextResponse.json(
        {
          ok: false,
          error: `Add ৳${row.minOrder - subtotal} more to unlock ${row.code} (min ৳${row.minOrder}).`,
        },
        { status: 400 },
      );
    }

    const rawDiscount =
      row.discountType === "fixed"
        ? row.discountValue
        : Math.round((subtotal * row.discountValue) / 100);
    const discount = row.maxDiscount ? Math.min(rawDiscount, row.maxDiscount) : rawDiscount;

    return NextResponse.json({
      ok: true,
      promo: {
        code: row.code,
        title: row.title,
        discountType: row.discountType,
        discountValue: row.discountValue,
        minOrder: row.minOrder,
        maxDiscount: row.maxDiscount,
        discount,
      },
    });
  } catch (error) {
    console.error("GET /api/promos/validate failed", error);
    return NextResponse.json({ ok: false, error: "Could not validate promo." }, { status: 500 });
  }
}
