import { PolicyPage } from "@/frontend/components/legal/PolicyPage";

export const metadata = {
  title: "Terms of Service | Arame",
};

export default function Page() {
  return (
    <PolicyPage
      title="Terms of Service"
      updated="August 24, 2026"
      intro="These terms set the rules for using the Arame website, creating an account, placing orders, and using payment and tracking features."
      sections={[
        {
          title: "Use of the Store",
          body: [
            "You agree to provide accurate account, delivery, and payment information when using Arame.",
            "You must not misuse the website, attempt unauthorized access, or interfere with checkout, payment, admin, or tracking systems.",
          ],
        },
        {
          title: "Products and Pricing",
          body: [
            "Product availability, descriptions, pricing, and images may change. We try to keep all product information accurate and current.",
            "Prices displayed in currencies other than NGN are for customer convenience. Paystack checkout is charged in NGN unless a different live payment setup is added later.",
          ],
        },
        {
          title: "Payments",
          body: [
            "Payments are processed through Paystack. Arame does not store full card numbers or CVV details.",
            "Orders are confirmed after successful Paystack verification or webhook confirmation.",
          ],
        },
        {
          title: "Orders",
          body: [
            "After checkout, you will receive an order reference and tracking code. Tracking updates are provided through the Arame tracker and email notifications where available.",
            "We may cancel or refund an order if payment verification fails, stock is unavailable, or delivery details cannot be confirmed.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For questions about these terms, contact aramesupport@gmail.com.",
          ],
        },
      ]}
    />
  );
}
