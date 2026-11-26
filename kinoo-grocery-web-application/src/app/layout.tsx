import type { Metadata } from "next";
import type { ReactNode } from "react";
import { StoreShell } from "@/components/store-shell";
import "./globals.css";
import "./admin/admin.css";

export const metadata: Metadata = {
  title: "Kinoo — Fresh groceries delivered across Dhaka",
  description:
    "Kinoo is Dhaka's fresh grocery bazar online. Rice, ilish, vegetables, dairy and household essentials delivered in 60–90 minutes. Cash on delivery, bKash & Nagad.",
  keywords: [
    "Kinoo",
    "grocery delivery Dhaka",
    "online bazar Bangladesh",
    "fresh vegetables Dhaka",
    "Meena Bazar alternative",
  ],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH"
          crossOrigin="anonymous"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <StoreShell>{children}</StoreShell>
      </body>
    </html>
  );
}
