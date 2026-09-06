"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type RevealLayerProps = {
  image: string;
  radius?: number;
  enhance?: boolean;
  containerRef?: RefObject<HTMLElement | null>;
};

const ENHANCE_FILTER = "brightness(1.15) saturate(1.35) contrast(1.08)";

function computeRevealEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  return !reducedMotion && !coarsePointer && !narrow;
}

/** CSS radial mask — no canvas / toDataURL (those froze marketing soft-nav). */
function maskImage(x: number, y: number, radius: number) {
  return `radial-gradient(circle ${radius}px at ${x}px ${y}px, #000 0%, #000 40%, rgba(0,0,0,0.75) 60%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.12) 88%, transparent 100%)`;
}

export function RevealLayer({
  image,
  radius = 260,
  enhance = false,
  containerRef,
}: RevealLayerProps) {
  const revealRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(computeRevealEnabled());
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const reveal = revealRef.current;
    const container = containerRef?.current;
    if (!reveal || !container) return;

    const mouse = { x: -999, y: -999 };
    const smooth = { x: -999, y: -999 };
    let raf = 0;
    let focusLocked = false;

    const toRelative = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (focusLocked) return;
      const next = toRelative(e.clientX, e.clientY);
      mouse.x = next.x;
      mouse.y = next.y;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || focusLocked) return;
      const next = toRelative(touch.clientX, touch.clientY);
      mouse.x = next.x;
      mouse.y = next.y;
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !container.contains(target)) return;
      focusLocked = true;
      const rect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      mouse.x = rect.left + rect.width / 2 - containerRect.left;
      mouse.y = rect.top + rect.height / 2 - containerRect.top;
    };

    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget;
      if (related instanceof Node && container.contains(related)) return;
      focusLocked = false;
    };

    const tick = () => {
      smooth.x += (mouse.x - smooth.x) * 0.1;
      smooth.y += (mouse.y - smooth.y) * 0.1;
      const mask = maskImage(smooth.x, smooth.y, radius);
      reveal.style.maskImage = mask;
      reveal.style.webkitMaskImage = mask;
      raf = requestAnimationFrame(tick);
    };

    container.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("focusin", onFocusIn);
    container.addEventListener("focusout", onFocusOut);
    raf = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("focusin", onFocusIn);
      container.removeEventListener("focusout", onFocusOut);
      cancelAnimationFrame(raf);
    };
  }, [containerRef, enabled, radius]);

  if (!enabled) return null;

  return (
    <div
      ref={revealRef}
      className="absolute inset-0 bg-center bg-cover bg-no-repeat z-30 pointer-events-none"
      style={{
        backgroundImage: `url(${image})`,
        filter: enhance ? ENHANCE_FILTER : undefined,
        maskImage: maskImage(-999, -999, radius),
        WebkitMaskImage: maskImage(-999, -999, radius),
      }}
      aria-hidden
    />
  );
}
