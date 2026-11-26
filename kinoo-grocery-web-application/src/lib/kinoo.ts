/** Shared constants, types and tiny helpers (safe for client and server). */

export const STORE = {
  name: "Kinoo",
  tagline: "Fresh groceries, Dhaka-delivered",
  hotline: "+880 9612 000 111",
  areas: ["Dhanmondi", "Gulshan", "Uttara", "Mirpur"] as const,
  deliveryFee: 50,
  freeDeliveryThreshold: 1000,
  promoCode: "KINOO10",
  promoRate: 0.1,
  paymentMethods: [
    { value: "cod", label: "Cash on Delivery", hint: "Pay the rider when your bag arrives" },
    { value: "bkash", label: "bKash", hint: "Send money to 01700 000 111" },
    { value: "nagad", label: "Nagad", hint: "Send money to 01700 000 222" },
  ] as const,
};

export type Area = (typeof STORE.areas)[number];
export type PaymentMethod = (typeof STORE.paymentMethods)[number]["value"];

export const NAV_CATEGORIES = [
  { slug: "fruits-vegetables", name: "Fruits & Vegetables", icon: "🥬" },
  { slug: "fish-meat", name: "Fish & Meat", icon: "🐟" },
  { slug: "cooking-essentials", name: "Cooking Essentials", icon: "🍚" },
  { slug: "dairy-eggs", name: "Dairy & Eggs", icon: "🥛" },
  { slug: "snacks-beverages", name: "Snacks & Beverages", icon: "🍪" },
  { slug: "household", name: "Household", icon: "🧴" },
] as const;

export type ProductDto = {
  id: number;
  slug: string;
  name: string;
  coName: string;
  categorySlug: string;
  unit: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  description: string;
  badge: string | null;
  rating: number;
  inStock: boolean;
  isDeal: boolean;
};

export type CategoryDto = {
  slug: string;
  name: string;
  blurb: string;
  icon: string;
  count: number;
};

export type CartLineDto = {
  productId: number;
  slug: string;
  name: string;
  unit: string;
  imageUrl: string;
  price: number;
  oldPrice: number | null;
  quantity: number;
  lineTotal: number;
};

export type CartDto = {
  items: CartLineDto[];
  count: number;
  subtotal: number;
};

export const EMPTY_CART: CartDto = { items: [], count: 0, subtotal: 0 };

export function formatTaka(amount: number): string {
  return `৳${Math.round(amount).toLocaleString("en-US")}`;
}

export function deliveryFeeFor(subtotal: number): number {
  if (subtotal <= 0) return 0;
  return subtotal >= STORE.freeDeliveryThreshold ? 0 : STORE.deliveryFee;
}

export function normalisePromo(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

export function discountFor(subtotal: number, code: string | null | undefined): number {
  if (normalisePromo(code) !== STORE.promoCode) return 0;
  return Math.round(subtotal * STORE.promoRate);
}

export function discountPercent(price: number, oldPrice: number | null): number {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function cartCount(items: { quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
