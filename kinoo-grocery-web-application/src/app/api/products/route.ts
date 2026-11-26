import type { NextRequest } from "next/server";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const limitParam = Number(params.get("limit"));
    const products = await getProducts({
      q: params.get("q"),
      category: params.get("category"),
      deals: params.get("deals") === "1",
      sort: params.get("sort"),
      limit: Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 60) : undefined,
    });

    return Response.json({ ok: true, products, count: products.length });
  } catch (error) {
    console.error("GET /api/products failed", error);
    return Response.json({ ok: false, error: "Could not load products." }, { status: 500 });
  }
}
