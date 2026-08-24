import { Suspense } from "react";
import { TrackOrderPage } from "@/frontend/components/track/TrackOrderPage";

export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return (
    <Suspense>
      <TrackOrderPage orderId={orderId} />
    </Suspense>
  );
}
