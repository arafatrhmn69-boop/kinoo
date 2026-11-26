import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { products } from "@/db/schema";
import { getAdminProducts, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function GET() {
  try {
    const list = await getAdminProducts();
    return NextResponse.json({ ok: true, products: list });
  } catch (error) {
    console.error("GET /api/admin/products failed", error);
    return NextResponse.json({ ok: false, error: "Could not load products." }, { status: 500 });
  }
}

type ProductBody = {
  id?: number;
  name?: string;
  slug?: string;
  coName?: string;
  categorySlug?: string;
  unit?: string;
  price?: number;
  oldPrice?: number | null;
  imageUrl?: string;
  description?: string;
  badge?: string | null;
  rating?: number;
  inStock?: boolean;
  stockQty?: number;
  isDeal?: boolean;
  sortOrder?: number;
};

export async function POST(request: NextRequest) {
  await ensureDatabase();

  let body: ProductBody;
  try {
    body = (await request.json()) as ProductBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Product name must be at least 2 characters." },
      { status: 400 },
    );
  }

  const unit = (body.unit ?? "").trim() || "1 pc";
  const categorySlug = (body.categorySlug ?? "").trim() || "fruits-vegetables";
  const price = Math.max(Math.round(Number(body.price) || 0), 1);
  const oldPriceRaw = body.oldPrice ? Math.round(Number(body.oldPrice)) : null;
  const oldPrice = oldPriceRaw && oldPriceRaw > price ? oldPriceRaw : null;
  const stockQty = Math.max(Math.round(Number(body.stockQty ?? 40)), 0);
  const inStock = body.inStock !== undefined ? Boolean(body.inStock) : stockQty > 0;
  const isDeal = Boolean(body.isDeal);
  const imageUrl =
    (body.imageUrl ?? "").trim() ||
    "https://images.pexels.com/photos/37321079/pexels-photo-37321079.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=720&h=540";

  let baseSlug = slugify(body.slug?.trim() || name) || `item-${Date.now()}`;
  const clash = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, baseSlug))
    .limit(1);
  if (clash.length > 0) {
    baseSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 899)}`;
  }

  try {
    const maxSort = await db
      .select({ max: sql<number>`coalesce(max(${products.sortOrder}), 0)::int` })
      .from(products);
    const sortOrder = (maxSort[0]?.max ?? 0) + 1;

    await db.insert(products).values({
      slug: baseSlug,
      name,
      coName: (body.coName ?? "").trim() || "Kinoo Fresh",
      categorySlug,
      unit,
      price,
      oldPrice,
      imageUrl,
      description: (body.description ?? "").trim(),
      badge: body.badge?.trim() || null,
      rating: Math.min(Math.max(Number(body.rating) || 4.7, 1), 5),
      inStock,
      stockQty,
      isDeal,
      sortOrder,
    });

    await logAdminActivity(`Added new SKU "${name}" at ৳${price}`, name, "product");
    const updated = await getAdminProducts();
    return NextResponse.json({ ok: true, products: updated });
  } catch (error) {
    console.error("POST /api/admin/products failed", error);
    return NextResponse.json({ ok: false, error: "Could not create product." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  let body: ProductBody;
  try {
    body = (await request.json()) as ProductBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Valid product id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    const patch: Partial<typeof products.$inferInsert> = {};
    if (body.name !== undefined && body.name.trim().length >= 2) patch.name = body.name.trim();
    if (body.coName !== undefined) patch.coName = body.coName.trim();
    if (body.categorySlug !== undefined && body.categorySlug.trim()) {
      patch.categorySlug = body.categorySlug.trim();
    }
    if (body.unit !== undefined && body.unit.trim()) patch.unit = body.unit.trim();
    if (body.price !== undefined) {
      patch.price = Math.max(Math.round(Number(body.price) || existing.price), 1);
    }
    if (body.oldPrice !== undefined) {
      const nextPrice = patch.price ?? existing.price;
      const candidate = body.oldPrice ? Math.round(Number(body.oldPrice)) : null;
      patch.oldPrice = candidate && candidate > nextPrice ? candidate : null;
    }
    if (body.imageUrl !== undefined && body.imageUrl.trim()) patch.imageUrl = body.imageUrl.trim();
    if (body.description !== undefined) patch.description = body.description.trim();
    if (body.badge !== undefined) patch.badge = body.badge?.trim() || null;
    if (body.rating !== undefined) {
      patch.rating = Math.min(Math.max(Number(body.rating) || existing.rating, 1), 5);
    }
    if (body.stockQty !== undefined) {
      patch.stockQty = Math.max(Math.round(Number(body.stockQty) || 0), 0);
      if (patch.stockQty === 0 && body.inStock === undefined) {
        patch.inStock = false;
      } else if (patch.stockQty > 0 && !existing.inStock && body.inStock === undefined) {
        patch.inStock = true;
      }
    }
    if (body.inStock !== undefined) {
      patch.inStock = Boolean(body.inStock);
      if (patch.inStock && (patch.stockQty ?? existing.stockQty) <= 0) {
        patch.stockQty = 25;
      }
    }
    if (body.isDeal !== undefined) patch.isDeal = Boolean(body.isDeal);
    if (body.sortOrder !== undefined) patch.sortOrder = Math.round(Number(body.sortOrder) || 0);

    await db.update(products).set(patch).where(eq(products.id, id));
    await logAdminActivity(
      `Updated product "${patch.name ?? existing.name}"`,
      patch.name ?? existing.name,
      "product",
    );

    const updated = await getAdminProducts();
    return NextResponse.json({ ok: true, products: updated });
  } catch (error) {
    console.error("PATCH /api/admin/products failed", error);
    return NextResponse.json({ ok: false, error: "Could not update product." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await ensureDatabase();

  const idParam = request.nextUrl.searchParams.get("id");
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Product id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Product not found." }, { status: 404 });
    }

    await db.delete(products).where(eq(products.id, id));
    await logAdminActivity(`Removed SKU "${existing.name}" from catalog`, existing.name, "product");

    const updated = await getAdminProducts();
    return NextResponse.json({ ok: true, products: updated });
  } catch (error) {
    console.error("DELETE /api/admin/products failed", error);
    return NextResponse.json({ ok: false, error: "Could not delete product." }, { status: 500 });
  }
}
