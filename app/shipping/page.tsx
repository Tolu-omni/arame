import { PolicyPage } from "@/frontend/components/legal/PolicyPage";

export const metadata = {
  title: "Shipping | Arame",
};

export default function Page() {
  return (
    <PolicyPage
      title="Shipping"
      updated="August 24, 2026"
      intro="This page explains how Arame handles order processing, delivery information, and tracking updates."
      sections={[
        {
          title: "Processing Time",
          body: [
            "Orders are reviewed after payment confirmation. Standard processing usually takes 1 to 2 business days before dispatch.",
            "Orders placed during weekends, holidays, or high-volume periods may take longer to prepare.",
          ],
        },
        {
          title: "Delivery Details",
          body: [
            "Customers must provide a complete delivery address, phone number, state, city, and email address at checkout.",
            "If delivery details are incomplete, Arame may contact you before dispatch. This can delay shipment.",
          ],
        },
        {
          title: "Tracking",
          body: [
            "Every confirmed order receives a tracking code. You can track the order from your account, the receipt page, or the tracking link sent by email.",
            "Tracking is updated by the Arame admin team as the order moves through paid, processing, packed, shipped, and delivered stages.",
          ],
        },
        {
          title: "Delivery Coverage",
          body: [
            "Delivery availability and timing may depend on the destination and courier availability.",
            "If a location cannot be served, Arame will contact the customer to agree on the next step.",
          ],
        },
        {
          title: "Support",
          body: [
            "For shipping questions, contact aramesupport@gmail.com with your order reference or tracking code.",
          ],
        },
      ]}
    />
  );
}
