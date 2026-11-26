import { Suspense } from "react";
import { Storefront } from "@/components/storefront";
import { getCategories, getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products, deals] = await Promise.all([
    getCategories(),
    getProducts(),
    getProducts({ deals: true }),
  ]);

  return (
    <Suspense
      fallback={
        <div className="k-container" style={{ padding: "48px 0" }}>
          <div className="search-pop" style={{ position: "static", padding: 18 }}>
            Filling the shelves with fresh Kinoo produce…
          </div>
        </div>
      }
    >
      <Storefront categories={categories} initialProducts={products} deals={deals} />
    </Suspense>
  );
}
