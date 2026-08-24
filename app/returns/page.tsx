import { PolicyPage } from "@/frontend/components/legal/PolicyPage";

export const metadata = {
  title: "Returns | Arame",
};

export default function Page() {
  return (
    <PolicyPage
      title="Returns"
      updated="August 24, 2026"
      intro="This page explains when Arame can accept returns, replacements, or support requests after delivery."
      sections={[
        {
          title: "Return Window",
          body: [
            "Return requests should be made within 7 days of delivery.",
            "Because fragrance and body oil products are personal-care items, opened or used products may not be eligible for return unless the item arrived damaged, incorrect, or faulty.",
          ],
        },
        {
          title: "Eligible Returns",
          body: [
            "A return may be approved when the wrong item was delivered, the item arrived damaged, or there is a verified fulfillment issue.",
            "Items should be returned in their original packaging where possible.",
          ],
        },
        {
          title: "Non-Returnable Items",
          body: [
            "Products that have been opened, used, altered, or damaged after delivery may not be accepted.",
            "Sale, promotional, or custom items may have separate return conditions if stated at purchase.",
          ],
        },
        {
          title: "Refunds and Replacements",
          body: [
            "Approved returns may be resolved through replacement, store credit, or refund depending on the issue and product availability.",
            "Refunds, where approved, are processed back through the original payment method where possible.",
          ],
        },
        {
          title: "Start a Return",
          body: [
            "Email aramesupport@gmail.com with your order reference, tracking code, photos where needed, and a short explanation of the issue.",
          ],
        },
      ]}
    />
  );
}
