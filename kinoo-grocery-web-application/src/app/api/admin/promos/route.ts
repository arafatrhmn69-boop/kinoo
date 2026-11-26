import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { promos } from "@/db/schema";
import { getAdminPromos, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getAdminPromos();
    return NextResponse.json({ ok: true, promos: list });
  } catch (error) {
    console.error("GET /api/admin/promos failed", error);
    return NextResponse.json({ ok: false, error: "Could not load promos." }, { status: 500 });
  }
}

type PromoBody = {
  id?: number;
  code?: string;
  title?: string;
  discountType?: string;
  discountValue?: number;
  minOrder?: number;
  maxDiscount?: number | null;
  active?: boolean;
};

export async function POST(request: NextRequest) {
  await ensureDatabase();

  let body: PromoBody;
  try {
    body = (await request.json()) as PromoBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const code = (body.code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 24);

  if (code.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Promo code must be at least 3 alphanumeric characters." },
      { status: 400 },
    );
  }

  const clash = await db.select({ id: promos.id }).from(promos).where(eq(promos.code, code)).limit(1);
  if (clash.length > 0) {
    return NextResponse.json({ ok: false, error: `Code ${code} already exists.` }, { status: 400 });
  }

  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Math.max(Math.round(Number(body.discountValue) || 10), 1);
  const cappedValue = discountType === "percent" ? Math.min(discountValue, 90) : discountValue;
  const minOrder = Math.max(Math.round(Number(body.minOrder) || 0), 0);
  const maxDiscount =
    body.maxDiscount && Number(body.maxDiscount) > 0
      ? Math.round(Number(body.maxDiscount))
      : null;

  try {
    await db.insert(promos).values({
      code,
      title: (body.title ?? "").trim() || `${code} discount campaign`,
      discountType,
      discountValue: cappedValue,
      minOrder,
      maxDiscount,
      active: body.active !== undefined ? Boolean(body.active) : true,
    });

    await logAdminActivity(`Launched promo campaign ${code}`, code, "promo");
    const updated = await getAdminPromos();
    return NextResponse.json({ ok: true, promos: updated });
  } catch (error) {
    console.error("POST /api/admin/promos failed", error);
    return NextResponse.json({ ok: false, error: "Could not create promo." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  let body: PromoBody;
  try {
    body = (await request.json()) as PromoBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Promo id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Promo not found." }, { status: 404 });
    }

    const patch: Partial<typeof promos.$inferInsert> = {};
    if (body.title !== undefined && body.title.trim()) patch.title = body.title.trim();
    if (body.discountType !== undefined) {
      patch.discountType = body.discountType === "fixed" ? "fixed" : "percent";
    }
    if (body.discountValue !== undefined) {
      patch.discountValue = Math.max(Math.round(Number(body.discountValue) || 1), 1);
    }
    if (body.minOrder !== undefined) {
      patch.minOrder = Math.max(Math.round(Number(body.minOrder) || 0), 0);
    }
    if (body.maxDiscount !== undefined) {
      patch.maxDiscount =
        body.maxDiscount && Number(body.maxDiscount) > 0
          ? Math.round(Number(body.maxDiscount))
          : null;
    }
    if (body.active !== undefined) patch.active = Boolean(body.active);

    await db.update(promos).set(patch).where(eq(promos.id, id));
    await logAdminActivity(
      `Updated promo ${existing.code}${
        body.active !== undefined ? (body.active ? " (activated)" : " (paused)") : ""
      }`,
      existing.code,
      "promo",
    );

    const updated = await getAdminPromos();
    return NextResponse.json({ ok: true, promos: updated });
  } catch (error) {
    console.error("PATCH /api/admin/promos failed", error);
    return NextResponse.json({ ok: false, error: "Could not update promo." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await ensureDatabase();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Promo id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Promo not found." }, { status: 404 });
    }

    await db.delete(promos).where(eq(promos.id, id));
    await logAdminActivity(`Deleted promo code ${existing.code}`, existing.code, "promo");

    const updated = await getAdminPromos();
    return NextResponse.json({ ok: true, promos: updated });
  } catch (error) {
    console.error("DELETE /api/admin/promos failed", error);
    return NextResponse.json({ ok: false, error: "Could not delete promo." }, { status: 500 });
  }
}
