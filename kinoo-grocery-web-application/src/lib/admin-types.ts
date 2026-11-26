/** Shared constants and DTO types for Kinoo Admin Studio (safe for client & server). */

export const ORDER_STATUSES = [
  { value: "confirmed", label: "Confirmed", color: "amber", icon: "bi-check-circle" },
  { value: "packing", label: "Packing at Bazar", color: "blue", icon: "bi-box-seam" },
  { value: "out_for_delivery", label: "Out for Delivery", color: "indigo", icon: "bi-bicycle" },
  { value: "delivered", label: "Delivered", color: "emerald", icon: "bi-patch-check-fill" },
  { value: "cancelled", label: "Cancelled", color: "rose", icon: "bi-x-octagon" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export const DHAKA_RIDERS = [
  "Kamal Hossain",
  "Rafiqul Mia",
  "Sohel Rana",
  "Jahangir Alam",
  "Mehedi Hasan",
] as const;

export type AdminOrderItem = {
  id: number;
  productId: number;
  name: string;
  unit: string;
  imageUrl: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type AdminOrderDto = {
  id: number;
  orderNumber: string;
  customerName: string;
  phone: string;
  area: string;
  address: string;
  note: string;
  paymentMethod: string;
  paymentNumber: string;
  promoCode: string;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: string;
  riderName: string;
  adminNote: string;
  createdAt: string;
  items: AdminOrderItem[];
};

export type AdminProductDto = {
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
  stockQty: number;
  isDeal: boolean;
  sortOrder: number;
  soldCount: number;
  revenue: number;
};

export type AdminCategoryDto = {
  id: number;
  slug: string;
  name: string;
  blurb: string;
  icon: string;
  sortOrder: number;
  productCount: number;
  revenue: number;
};

export type AdminPromoDto = {
  id: number;
  code: string;
  title: string;
  discountType: string;
  discountValue: number;
  minOrder: number;
  maxDiscount: number | null;
  active: boolean;
  usageCount: number;
  createdAt: string;
};

export type AdminCustomerDto = {
  phone: string;
  name: string;
  area: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  lastOrderNumber: string;
  preferredPayment: string;
  orders: {
    orderNumber: string;
    total: number;
    status: string;
    createdAt: string;
    itemCount: number;
  }[];
};

export type AdminActivityDto = {
  id: number;
  actor: string;
  action: string;
  target: string;
  category: string;
  createdAt: string;
};

export type AdminDashboardDto = {
  metrics: {
    grossRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    activeOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    avgOrderValue: number;
    fulfillmentRate: number;
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    dealsCount: number;
    uniqueCustomers: number;
    repeatCustomers: number;
  };
  revenueSeries: {
    date: string;
    label: string;
    revenue: number;
    orders: number;
  }[];
  areaBreakdown: {
    area: string;
    orders: number;
    revenue: number;
    share: number;
  }[];
  paymentBreakdown: {
    method: string;
    label: string;
    orders: number;
    revenue: number;
    share: number;
  }[];
  statusCounts: Record<string, number>;
  orders: AdminOrderDto[];
  products: AdminProductDto[];
  categories: AdminCategoryDto[];
  promos: AdminPromoDto[];
  customers: AdminCustomerDto[];
  activities: AdminActivityDto[];
  settings: Record<string, string>;
};
