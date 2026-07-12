"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

type CursorPos = { x: number; y: number };

export function useSpotlightCursor(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean
): { cursorPos: CursorPos; enabled: boolean } {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const focusLocked = useRef(false);
  const [cursorPos, setCursorPos] = useState<CursorPos>({ x: -999, y: -999 });
  const [motionEnabled, setMotionEnabled] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionEnabled(!mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isActive = enabled && motionEnabled;

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    const toRelative = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const updatePosition = (clientX: number, clientY: number) => {
      if (focusLocked.current) return;
      mouse.current = toRelative(clientX, clientY);
    };

    const onMouseMove = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !container.contains(target)) return;
      focusLocked.current = true;
      const rect = target.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      mouse.current = {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      };
    };

    const onFocusOut = (e: FocusEvent) => {
      const related = e.relatedTarget;
      if (related instanceof Node && container.contains(related)) return;
      focusLocked.current = false;
    };

    const tick = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(tick);
    };

    container.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("focusin", onFocusIn);
    container.addEventListener("focusout", onFocusOut);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("focusin", onFocusIn);
      container.removeEventListener("focusout", onFocusOut);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, containerRef]);

  return { cursorPos, enabled: isActive };
}
