import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T-REX CRM - Construction, Railroad & Environmental",
  description: "Deal-Centric Customer Relationship Management system for Construction, Railroad, and Environmental industries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
