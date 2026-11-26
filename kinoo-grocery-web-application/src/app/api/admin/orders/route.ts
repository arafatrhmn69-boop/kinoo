import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { orders } from "@/db/schema";
import { ORDER_STATUSES, getAdminOrders, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await getAdminOrders();
    return NextResponse.json({ ok: true, orders: list });
  } catch (error) {
    console.error("GET /api/admin/orders failed", error);
    return NextResponse.json({ ok: false, error: "Failed to load orders." }, { status: 500 });
  }
}

type PatchOrderBody = {
  id?: number;
  orderNumber?: string;
  status?: string;
  riderName?: string;
  adminNote?: string;
};

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  let body: PatchOrderBody;
  try {
    body = (await request.json()) as PatchOrderBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload." }, { status: 400 });
  }

  const id = Number(body.id);
  const orderNumber = body.orderNumber?.trim();

  if ((!Number.isFinite(id) || id <= 0) && !orderNumber) {
    return NextResponse.json({ ok: false, error: "Order identifier required." }, { status: 400 });
  }

  try {
    const [existing] = await db
      .select()
      .from(orders)
      .where(orderNumber ? eq(orders.orderNumber, orderNumber) : eq(orders.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Order not found." }, { status: 404 });
    }

    const patch: Partial<typeof orders.$inferInsert> = {};
    const changes: string[] = [];

    if (typeof body.status === "string") {
      const valid = ORDER_STATUSES.some((s) => s.value === body.status);
      if (!valid) {
        return NextResponse.json({ ok: false, error: "Invalid order status." }, { status: 400 });
      }
      if (body.status !== existing.status) {
        patch.status = body.status;
        const label = ORDER_STATUSES.find((s) => s.value === body.status)?.label ?? body.status;
        changes.push(`status → ${label}`);
      }
    }

    if (typeof body.riderName === "string" && body.riderName !== existing.riderName) {
      patch.riderName = body.riderName.trim();
      changes.push(
        body.riderName.trim() ? `assigned rider ${body.riderName.trim()}` : "unassigned rider",
      );
    }

    if (typeof body.adminNote === "string" && body.adminNote !== existing.adminNote) {
      patch.adminNote = body.adminNote.trim().slice(0, 500);
      changes.push("updated dispatch note");
    }

    if (Object.keys(patch).length > 0) {
      await db.update(orders).set(patch).where(eq(orders.id, existing.id));
      await logAdminActivity(
        `Updated order (${changes.join(", ")})`,
        existing.orderNumber,
        "order",
      );
    }

    const updatedOrders = await getAdminOrders();
    const updated = updatedOrders.find((o) => o.id === existing.id) ?? null;

    return NextResponse.json({ ok: true, order: updated, orders: updatedOrders });
  } catch (error) {
    console.error("PATCH /api/admin/orders failed", error);
    return NextResponse.json({ ok: false, error: "Failed to update order." }, { status: 500 });
  }
}
