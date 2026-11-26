import type { Metadata } from "next";
import { AdminStudio } from "@/components/admin/admin-studio";
import { getAdminDashboard } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Studio — Kinoo Dhaka Operations",
  description:
    "Executive command center for Kinoo grocery dispatch, inventory, pricing, promos and Dhaka customer analytics.",
};

export default async function AdminPage() {
  const dashboard = await getAdminDashboard();
  return <AdminStudio initialData={dashboard} />;
}
