import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RestoreProof — DR Exercise Tracker",
  description:
    "Synthetic disaster-recovery exercise tracker with RPO/RTO scoring. Portfolio demo by Saeed Rumaneh.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
