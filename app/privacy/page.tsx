import { PolicyPage } from "@/frontend/components/legal/PolicyPage";

export const metadata = {
  title: "Privacy Policy | Arame",
};

export default function Page() {
  return (
    <PolicyPage
      title="Privacy Policy"
      updated="August 24, 2026"
      intro="This policy explains how Arame collects and uses customer information for account access, checkout, delivery, support, and order tracking."
      sections={[
        {
          title: "Information We Collect",
          body: [
            "We collect account details such as name, email address, saved delivery addresses, order history, and profile information when you create or use an Arame account.",
            "At checkout, we collect delivery details, contact details, order items, and Paystack payment references. Card details are handled by Paystack; Arame stores only safe card metadata such as brand, last four digits, and reusable authorization references when you choose to save a card.",
          ],
        },
        {
          title: "How We Use Information",
          body: [
            "We use your information to process orders, confirm payments, send receipts, provide order tracking, manage your account, and respond to support requests.",
            "We may use order and product activity to improve product availability, store operations, and the shopping experience.",
          ],
        },
        {
          title: "Sharing",
          body: [
            "We share only the information required to operate the store with trusted service providers such as Supabase for account and order storage, Paystack for payment processing, and our email provider for transactional messages.",
            "We do not sell customer personal information.",
          ],
        },
        {
          title: "Security",
          body: [
            "We use access controls, database policies, and server-side payment verification to protect customer and order data.",
            "No online system is perfect, so customers should use strong passwords and keep account access secure.",
          ],
        },
        {
          title: "Contact",
          body: [
            "For privacy questions or account data requests, contact aramesupport@gmail.com.",
          ],
        },
      ]}
    />
  );
}
