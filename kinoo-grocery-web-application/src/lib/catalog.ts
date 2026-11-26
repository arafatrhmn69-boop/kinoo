import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/db/bootstrap";
import { categories, products } from "@/db/schema";
import type { CategoryDto, ProductDto } from "@/lib/kinoo";

type ProductRow = typeof products.$inferSelect;

function toDto(row: ProductRow): ProductDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    coName: row.coName,
    categorySlug: row.categorySlug,
    unit: row.unit,
    price: row.price,
    oldPrice: row.oldPrice,
    imageUrl: row.imageUrl,
    description: row.description,
    badge: row.badge,
    rating: row.rating,
    inStock: row.inStock,
    isDeal: row.isDeal,
  };
}

export async function getCategories(): Promise<CategoryDto[]> {
  await ensureDatabase();
  const rows = await db
    .select({
      slug: categories.slug,
      name: categories.name,
      blurb: categories.blurb,
      icon: categories.icon,
      count: sql<number>`(
        select count(*)::int from ${products}
        where ${products.categorySlug} = ${categories.slug}
      )`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder));

  return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

export type ProductQuery = {
  category?: string | null;
  q?: string | null;
  deals?: boolean;
  sort?: string | null;
  limit?: number;
};

export async function getProducts(query: ProductQuery = {}): Promise<ProductDto[]> {
  await ensureDatabase();

  const filters = [];
  if (query.category && query.category !== "all") {
    filters.push(eq(products.categorySlug, query.category));
  }
  if (query.deals) {
    filters.push(eq(products.isDeal, true));
  }
  const term = query.q?.trim();
  if (term) {
    const like = `%${term}%`;
    filters.push(
      or(
        ilike(products.name, like),
        ilike(products.coName, like),
        ilike(products.description, like),
        ilike(products.unit, like),
      ),
    );
  }

  const orderBy =
    query.sort === "price-asc"
      ? [asc(products.price)]
      : query.sort === "price-desc"
        ? [desc(products.price)]
        : query.sort === "rating"
          ? [desc(products.rating)]
          : [asc(products.sortOrder)];

  let statement = db
    .select()
    .from(products)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(...orderBy)
    .$dynamic();

  if (query.limit && query.limit > 0) {
    statement = statement.limit(query.limit);
  }

  const rows = await statement;
  return rows.map(toDto);
}

export async function getProductsByIds(ids: number[]): Promise<ProductDto[]> {
  if (ids.length === 0) return [];
  await ensureDatabase();
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  return rows.map(toDto);
}

export async function getProductById(id: number): Promise<ProductDto | null> {
  await ensureDatabase();
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const row = rows[0];
  return row ? toDto(row) : null;
}
