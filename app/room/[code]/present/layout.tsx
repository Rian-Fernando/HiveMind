import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presenter view",
  description:
    "Full-screen HiveMind view for projectors: a large QR code, a live submission counter, and the results reveal.",
  robots: { index: false, follow: false },
};

export default function PresentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
