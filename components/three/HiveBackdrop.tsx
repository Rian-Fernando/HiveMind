"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const HiveScene = dynamic(() => import("./HiveScene"), { ssr: false });

/**
 * Decorative WebGL backdrop for the landing page.
 *
 * Everything here is progressive enhancement — the page's content is
 * server-rendered HTML that sits on top. If WebGL is unavailable the
 * canvas simply never mounts, and if the visitor prefers reduced motion
 * the scene renders as a still frame at its most striking moment.
 *
 * The scene stays alive for the whole page: the story drives it from act
 * one to act four, and past the story it keeps idling (crystals orbiting,
 * motes drifting) behind a progressively heavier scrim so the denser
 * content sections stay comfortable to read.
 *
 * @param storyId  id of the element whose scroll range drives the story
 */
export function HiveBackdrop({ storyId }: { storyId: string }) {
  // raw scroll position; the scene eases toward this rather than snapping to it
  const targetRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [active, setActive] = useState(true);

  useEffect(() => {
    // WebGL capability check — bail out quietly if unsupported
    let supported = false;
    try {
      const canvas = document.createElement("canvas");
      supported = Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl")
      );
    } catch {
      supported = false;
    }
    if (!supported) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const smallOrWeak =
      coarse.matches ||
      window.innerWidth < 768 ||
      (navigator.hardwareConcurrency ?? 8) <= 4;

    setAnimate(!reduce.matches);
    setQuality(smallOrWeak ? "low" : "high");
    // reduced motion → hold the scene at the fusion moment, no scrolling story
    if (reduce.matches) targetRef.current = 0.68;
    setMounted(true);

    const onReduceChange = () => {
      setAnimate(!reduce.matches);
      if (reduce.matches) targetRef.current = 0.68;
    };
    reduce.addEventListener("change", onReduceChange);
    return () => reduce.removeEventListener("change", onReduceChange);
  }, []);

  // scroll → story progress, plus how far past the story we are (drives the
  // extra scrim). Skipped entirely under reduced motion.
  useEffect(() => {
    if (!mounted || !animate) return;
    const story = document.getElementById(storyId);
    if (!story) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = story.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      targetRef.current =
        total <= 0 ? 0 : Math.min(Math.max(scrolled / total, 0), 1);

      // 0 while the story is on screen, ramping to 1 over the viewport after it
      const past = Math.min(
        Math.max((scrolled - total) / (window.innerHeight * 0.75), 0),
        1
      );
      wrapRef.current?.style.setProperty("--past", past.toFixed(3));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mounted, animate, storyId]);

  // only stop rendering when the tab isn't being looked at
  useEffect(() => {
    if (!mounted) return;
    const onVisibility = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mounted]);

  // subtle parallax so the scene reads as a physical space
  useEffect(() => {
    if (!mounted || !animate || quality === "low") return;
    const onMove = (e: PointerEvent) => {
      pointerRef.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mounted, animate, quality]);

  if (!mounted) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
    >
      <HiveScene
        targetRef={targetRef}
        pointerRef={pointerRef}
        animate={animate}
        quality={quality}
        active={active}
      />
      {/* keeps overlaid story copy legible against the brightest bloom */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/30 to-ink/85" />
      {/* settles the scene down behind the denser content further down */}
      <div
        className="absolute inset-0 bg-ink"
        style={{ opacity: "calc(var(--past, 0) * 0.8)" }}
      />
    </div>
  );
}
