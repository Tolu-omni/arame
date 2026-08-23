import "./globals.css";
import { SplashScreen } from "@/frontend/components/shared/SplashScreen";
import { AppProviders } from "@/frontend/components/shared/AppProviders";

export const metadata = {
  title: "Arame",
  description: "Arame ecommerce app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SplashScreen />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
