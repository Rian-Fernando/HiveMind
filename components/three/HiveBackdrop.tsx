"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const HiveScene = dynamic(() => import("./HiveScene"), { ssr: false });

/**
 * Decorative WebGL backdrop for the landing story.
 *
 * Everything here is progressive enhancement — the page's content is
 * server-rendered HTML that sits on top. If WebGL is unavailable the
 * canvas simply never mounts, and if the visitor prefers reduced motion
 * the scene renders as a still frame at its most striking moment.
 *
 * @param storyId  id of the element whose scroll range drives the scene
 */
export function HiveBackdrop({ storyId }: { storyId: string }) {
  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
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
    if (reduce.matches) progressRef.current = 0.68;
    setMounted(true);

    const onReduceChange = () => {
      setAnimate(!reduce.matches);
      if (reduce.matches) progressRef.current = 0.68;
    };
    reduce.addEventListener("change", onReduceChange);
    return () => reduce.removeEventListener("change", onReduceChange);
  }, []);

  // scroll → story progress (skipped entirely under reduced motion)
  useEffect(() => {
    if (!mounted || !animate) return;
    const story = document.getElementById(storyId);
    if (!story) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = story.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      progressRef.current =
        total <= 0 ? 0 : Math.min(Math.max(-rect.top / total, 0), 1);
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

  // pause the render loop once the story is off-screen
  useEffect(() => {
    if (!mounted) return;
    const story = document.getElementById(storyId);
    if (!story) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "120px" }
    );
    io.observe(story);
    return () => io.disconnect();
  }, [mounted, storyId]);

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
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-1000"
      style={{ opacity: active ? 1 : 0 }}
    >
      <HiveScene
        progressRef={progressRef}
        pointerRef={pointerRef}
        animate={animate}
        quality={quality}
        active={active}
      />
      {/* keeps overlaid text legible against the brightest bloom */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/45 to-ink/90" />
    </div>
  );
}
