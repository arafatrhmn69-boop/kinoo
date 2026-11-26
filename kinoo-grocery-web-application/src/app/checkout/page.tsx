import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = {
  title: "Checkout — Kinoo",
  description: "Review your Kinoo bag, choose cash on delivery, bKash or Nagad and place your order.",
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
