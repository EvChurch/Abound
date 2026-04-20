import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giving Management",
  description: "Church giving management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
