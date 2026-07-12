"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export type BgTheme =
  | "ember"
  | "aurora"
  | "midnight"
  | "slate"
  | "copper"
  | "mist"
  | "canopy"
  | "summit"
  | "forge"
  | "dusk"
  | "depth"
  | "stone"
  | "signal"
  | "trail"
  | "prism";

type OrbConfig = {
  color: string;
  size: string;
  top: string;
  left: string;
  duration: number;
  delay: number;
};

type ThemePreset = {
  base: string;
  orbs: OrbConfig[];
};

const THEME_PRESETS: Record<BgTheme, ThemePreset> = {
  ember: {
    base: "#080604",
    orbs: [
      { color: "rgba(234, 88, 12, 0.4)", size: "44vw", top: "8%", left: "-10%", duration: 18, delay: 0 },
      { color: "rgba(244, 63, 94, 0.25)", size: "32vw", top: "60%", left: "65%", duration: 22, delay: 2 },
      { color: "rgba(251, 146, 60, 0.2)", size: "26vw", top: "75%", left: "5%", duration: 16, delay: 4 },
    ],
  },
  aurora: {
    base: "#040608",
    orbs: [
      { color: "rgba(16, 185, 129, 0.32)", size: "40vw", top: "12%", left: "55%", duration: 20, delay: 0 },
      { color: "rgba(99, 102, 241, 0.28)", size: "34vw", top: "58%", left: "-5%", duration: 24, delay: 1 },
      { color: "rgba(45, 212, 191, 0.18)", size: "22vw", top: "-4%", left: "20%", duration: 17, delay: 3 },
    ],
  },
  midnight: {
    base: "#03050a",
    orbs: [
      { color: "rgba(59, 130, 246, 0.35)", size: "42vw", top: "15%", left: "10%", duration: 21, delay: 0 },
      { color: "rgba(139, 92, 246, 0.28)", size: "36vw", top: "55%", left: "58%", duration: 19, delay: 2 },
      { color: "rgba(30, 64, 175, 0.22)", size: "28vw", top: "80%", left: "25%", duration: 23, delay: 4 },
    ],
  },
  slate: {
    base: "#060608",
    orbs: [
      { color: "rgba(100, 116, 139, 0.35)", size: "38vw", top: "10%", left: "50%", duration: 20, delay: 0 },
      { color: "rgba(99, 102, 241, 0.22)", size: "32vw", top: "65%", left: "0%", duration: 18, delay: 2 },
      { color: "rgba(148, 163, 184, 0.15)", size: "24vw", top: "30%", left: "70%", duration: 22, delay: 1 },
    ],
  },
  copper: {
    base: "#080604",
    orbs: [
      { color: "rgba(217, 119, 6, 0.35)", size: "40vw", top: "20%", left: "-8%", duration: 19, delay: 0 },
      { color: "rgba(180, 83, 9, 0.25)", size: "30vw", top: "62%", left: "62%", duration: 21, delay: 3 },
      { color: "rgba(245, 158, 11, 0.18)", size: "26vw", top: "-5%", left: "45%", duration: 17, delay: 1 },
    ],
  },
  mist: {
    base: "#040608",
    orbs: [
      { color: "rgba(56, 189, 248, 0.28)", size: "42vw", top: "8%", left: "30%", duration: 22, delay: 0 },
      { color: "rgba(148, 163, 184, 0.25)", size: "34vw", top: "55%", left: "55%", duration: 18, delay: 2 },
      { color: "rgba(94, 234, 212, 0.15)", size: "24vw", top: "78%", left: "8%", duration: 20, delay: 4 },
    ],
  },
  canopy: {
    base: "#030806",
    orbs: [
      { color: "rgba(34, 197, 94, 0.3)", size: "40vw", top: "12%", left: "-5%", duration: 20, delay: 0 },
      { color: "rgba(22, 163, 74, 0.22)", size: "32vw", top: "58%", left: "60%", duration: 23, delay: 2 },
      { color: "rgba(74, 222, 128, 0.15)", size: "26vw", top: "72%", left: "15%", duration: 17, delay: 1 },
    ],
  },
  summit: {
    base: "#05040a",
    orbs: [
      { color: "rgba(168, 85, 247, 0.32)", size: "44vw", top: "5%", left: "50%", duration: 21, delay: 0 },
      { color: "rgba(79, 70, 229, 0.25)", size: "34vw", top: "60%", left: "-8%", duration: 19, delay: 3 },
      { color: "rgba(192, 132, 252, 0.18)", size: "28vw", top: "75%", left: "55%", duration: 24, delay: 1 },
    ],
  },
  forge: {
    base: "#080506",
    orbs: [
      { color: "rgba(239, 68, 68, 0.28)", size: "38vw", top: "15%", left: "62%", duration: 18, delay: 0 },
      { color: "rgba(234, 88, 12, 0.3)", size: "36vw", top: "55%", left: "5%", duration: 22, delay: 2 },
      { color: "rgba(251, 191, 36, 0.15)", size: "24vw", top: "-8%", left: "25%", duration: 20, delay: 4 },
    ],
  },
  dusk: {
    base: "#060408",
    orbs: [
      { color: "rgba(236, 72, 153, 0.28)", size: "40vw", top: "10%", left: "15%", duration: 20, delay: 0 },
      { color: "rgba(129, 140, 248, 0.25)", size: "34vw", top: "62%", left: "58%", duration: 23, delay: 2 },
      { color: "rgba(167, 139, 250, 0.18)", size: "26vw", top: "78%", left: "0%", duration: 18, delay: 1 },
    ],
  },
  depth: {
    base: "#020508",
    orbs: [
      { color: "rgba(14, 165, 233, 0.3)", size: "42vw", top: "18%", left: "55%", duration: 21, delay: 0 },
      { color: "rgba(6, 182, 212, 0.22)", size: "32vw", top: "58%", left: "-5%", duration: 19, delay: 3 },
      { color: "rgba(37, 99, 235, 0.18)", size: "28vw", top: "82%", left: "40%", duration: 24, delay: 1 },
    ],
  },
  stone: {
    base: "#060606",
    orbs: [
      { color: "rgba(115, 115, 115, 0.28)", size: "38vw", top: "12%", left: "40%", duration: 22, delay: 0 },
      { color: "rgba(82, 82, 82, 0.22)", size: "32vw", top: "65%", left: "10%", duration: 20, delay: 2 },
      { color: "rgba(163, 163, 163, 0.12)", size: "24vw", top: "30%", left: "72%", duration: 18, delay: 4 },
    ],
  },
  signal: {
    base: "#030806",
    orbs: [
      { color: "rgba(52, 211, 153, 0.32)", size: "40vw", top: "8%", left: "58%", duration: 19, delay: 0 },
      { color: "rgba(20, 184, 166, 0.25)", size: "34vw", top: "55%", left: "0%", duration: 21, delay: 2 },
      { color: "rgba(110, 231, 183, 0.15)", size: "26vw", top: "75%", left: "45%", duration: 17, delay: 1 },
    ],
  },
  trail: {
    base: "#040806",
    orbs: [
      { color: "rgba(21, 128, 61, 0.3)", size: "42vw", top: "10%", left: "-8%", duration: 20, delay: 0 },
      { color: "rgba(5, 150, 105, 0.22)", size: "30vw", top: "60%", left: "65%", duration: 23, delay: 3 },
      { color: "rgba(134, 239, 172, 0.15)", size: "24vw", top: "78%", left: "20%", duration: 18, delay: 1 },
    ],
  },
  prism: {
    base: "#050508",
    orbs: [
      { color: "rgba(234, 88, 12, 0.35)", size: "42vw", top: "10%", left: "-8%", duration: 18, delay: 0 },
      { color: "rgba(99, 102, 241, 0.28)", size: "36vw", top: "55%", left: "62%", duration: 22, delay: 2 },
      { color: "rgba(16, 185, 129, 0.22)", size: "28vw", top: "72%", left: "8%", duration: 16, delay: 4 },
      { color: "rgba(244, 63, 94, 0.18)", size: "24vw", top: "-6%", left: "58%", duration: 20, delay: 1 },
    ],
  },
};

type AnimatedDarkBgProps = {
  theme?: BgTheme;
  className?: string;
};

export function AnimatedDarkBg({ theme = "prism", className = "" }: AnimatedDarkBgProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preset = THEME_PRESETS[theme];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const orbs = container.querySelectorAll<HTMLElement>("[data-orb]");
    const grid = container.querySelector<HTMLElement>("[data-grid]");

    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        const cfg = preset.orbs[i];
        if (!cfg) return;
        gsap.to(orb, {
          x: "random(-80, 80)",
          y: "random(-60, 60)",
          scale: "random(0.85, 1.15)",
          duration: cfg.duration,
          delay: cfg.delay,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      if (grid) {
        gsap.to(grid, {
          backgroundPosition: "0% 100%",
          duration: 30,
          repeat: -1,
          ease: "none",
        });
      }
    }, container);

    return () => ctx.revert();
  }, [preset]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-0 overflow-hidden ${className}`}
      style={{ backgroundColor: preset.base }}
      aria-hidden
    >
      <div
        data-grid
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          backgroundPosition: "0% 0%",
        }}
      />

      {preset.orbs.map((orb, i) => (
        <div
          key={i}
          data-orb
          className="absolute rounded-full blur-[80px] will-change-transform"
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/50" />
    </div>
  );
}
