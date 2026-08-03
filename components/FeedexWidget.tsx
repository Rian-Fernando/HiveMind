"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

/**
 * Feedex feedback widget — https://feedex.rianfernando.com
 *
 * Mounted site-wide when NEXT_PUBLIC_FEEDEX_KEY is set, and absent entirely
 * when it isn't, so local development and forks render nothing.
 *
 * Loaded with `lazyOnload` deliberately: the landing page keeps its first
 * load lean for the 3D scene, and a feedback button has no reason to
 * compete with that.
 */
export function FeedexWidget({ publicKey }: { publicKey: string }) {
  const pathname = usePathname();

  // The presenter view is projected in front of a room — nothing floating
  // on top of it. It always opens in a new tab, so this check is enough.
  if (pathname?.endsWith("/present")) return null;

  return (
    <Script
      src="https://feedex.rianfernando.com/widget.js"
      data-feedex-key={publicKey}
      strategy="lazyOnload"
    />
  );
}
