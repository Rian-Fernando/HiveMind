import type { Metadata } from "next";

// Room pages are ephemeral private sessions — keep them out of search
// engines (robots.txt also disallows /room/, but a crawler that reaches
// one via a shared link gets an explicit noindex).
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
