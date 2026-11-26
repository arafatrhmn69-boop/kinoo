import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { storeSettings } from "@/db/schema";
import { getAdminSettings, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getAdminSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("GET /api/admin/settings failed", error);
    return NextResponse.json({ ok: false, error: "Could not load settings." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid settings payload." }, { status: 400 });
  }

  const allowedKeys = [
    "storeName",
    "tagline",
    "hotline",
    "supportEmail",
    "deliveryFee",
    "freeDeliveryThreshold",
    "deliveryWindow",
    "bkashMerchant",
    "nagadMerchant",
    "storeOpen",
    "areas",
  ];

  try {
    let changed = 0;
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        const value =
          typeof body[key] === "string"
            ? (body[key] as string).trim()
            : JSON.stringify(body[key]);
        await db
          .insert(storeSettings)
          .values({ key, value, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: storeSettings.key,
            set: { value, updatedAt: new Date() },
          });
        changed += 1;
      }
    }

    if (changed > 0) {
      await logAdminActivity(`Updated store configuration (${changed} fields)`, "Store Settings", "settings");
    }

    const settings = await getAdminSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("PATCH /api/admin/settings failed", error);
    return NextResponse.json({ ok: false, error: "Could not save settings." }, { status: 500 });
  }
}
