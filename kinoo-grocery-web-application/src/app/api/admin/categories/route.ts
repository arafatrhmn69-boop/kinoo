import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { categories, products } from "@/db/schema";
import { getAdminCategories, logAdminActivity } from "@/lib/admin";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function GET() {
  try {
    const list = await getAdminCategories();
    return NextResponse.json({ ok: true, categories: list });
  } catch (error) {
    console.error("GET /api/admin/categories failed", error);
    return NextResponse.json({ ok: false, error: "Could not load categories." }, { status: 500 });
  }
}

type CategoryBody = {
  id?: number;
  name?: string;
  slug?: string;
  blurb?: string;
  icon?: string;
  sortOrder?: number;
};

export async function POST(request: NextRequest) {
  await ensureDatabase();

  let body: CategoryBody;
  try {
    body = (await request.json()) as CategoryBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Category name must be at least 2 characters." },
      { status: 400 },
    );
  }

  let slug = slugify(body.slug?.trim() || name) || `aisle-${Date.now()}`;
  const clash = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (clash.length > 0) {
    slug = `${slug}-${Math.floor(10 + Math.random() * 89)}`;
  }

  try {
    const maxSort = await db
      .select({ max: sql<number>`coalesce(max(${categories.sortOrder}), 0)::int` })
      .from(categories);

    await db.insert(categories).values({
      slug,
      name,
      blurb: (body.blurb ?? "").trim() || "Fresh everyday essentials",
      icon: (body.icon ?? "").trim() || "🛒",
      sortOrder: body.sortOrder ?? (maxSort[0]?.max ?? 0) + 1,
    });

    await logAdminActivity(`Created new store aisle "${name}"`, name, "category");
    const updated = await getAdminCategories();
    return NextResponse.json({ ok: true, categories: updated });
  } catch (error) {
    console.error("POST /api/admin/categories failed", error);
    return NextResponse.json({ ok: false, error: "Could not create category." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  await ensureDatabase();

  let body: CategoryBody;
  try {
    body = (await request.json()) as CategoryBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Category id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Category not found." }, { status: 404 });
    }

    const patch: Partial<typeof categories.$inferInsert> = {};
    if (body.name !== undefined && body.name.trim().length >= 2) patch.name = body.name.trim();
    if (body.blurb !== undefined) patch.blurb = body.blurb.trim();
    if (body.icon !== undefined && body.icon.trim()) patch.icon = body.icon.trim();
    if (body.sortOrder !== undefined) patch.sortOrder = Math.round(Number(body.sortOrder) || 0);

    await db.update(categories).set(patch).where(eq(categories.id, id));
    await logAdminActivity(
      `Updated aisle "${patch.name ?? existing.name}"`,
      patch.name ?? existing.name,
      "category",
    );

    const updated = await getAdminCategories();
    return NextResponse.json({ ok: true, categories: updated });
  } catch (error) {
    console.error("PATCH /api/admin/categories failed", error);
    return NextResponse.json({ ok: false, error: "Could not update category." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  await ensureDatabase();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Category id required." }, { status: 400 });
  }

  try {
    const [existing] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Category not found." }, { status: 404 });
    }

    const assigned = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.categorySlug, existing.slug));

    if ((assigned[0]?.count ?? 0) > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Move or delete the ${assigned[0]?.count} products in "${existing.name}" first.`,
        },
        { status: 400 },
      );
    }

    await db.delete(categories).where(eq(categories.id, id));
    await logAdminActivity(`Removed empty aisle "${existing.name}"`, existing.name, "category");

    const updated = await getAdminCategories();
    return NextResponse.json({ ok: true, categories: updated });
  } catch (error) {
    console.error("DELETE /api/admin/categories failed", error);
    return NextResponse.json({ ok: false, error: "Could not delete category." }, { status: 500 });
  }
}
