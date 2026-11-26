import { NextResponse } from "next/server";
import { getAdminDashboard } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dashboard = await getAdminDashboard();
    return NextResponse.json({ ok: true, dashboard });
  } catch (error) {
    console.error("GET /api/admin/overview failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not load admin dashboard." },
      { status: 500 },
    );
  }
}
