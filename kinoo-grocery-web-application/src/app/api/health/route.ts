import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { products } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureDatabase();
    const rows = await db.select({ id: products.id }).from(products).limit(1);

    return Response.json({
      ok: true,
      store: "Kinoo",
      database: "postgresql",
      catalogReady: rows.length > 0,
    });
  } catch (error) {
    console.error("Health check failed", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
