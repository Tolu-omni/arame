import { Suspense } from "react";
import { AdminPage } from "@/frontend/components/admin/AdminPage";

export const metadata = {
  title: "Admin Panel - Arame",
  description: "Aramè administrator control center.",
};

export default function Page() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
