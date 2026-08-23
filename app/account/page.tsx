import { Suspense } from "react";
import { AccountPage } from "@/frontend/components/account/AccountPage";

export default function Page() {
  return (
    <Suspense>
      <AccountPage />
    </Suspense>
  );
}
