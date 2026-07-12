"use client";

import { useEffect, useRef, useState } from "react";
import { MarketingNav } from "./marketing-nav";
import { RevealLayer } from "./reveal-layer";

const BG_IMAGE_1 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85";

const BG_IMAGE_2 =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85";

const SPOTLIGHT_R = 260;

type HeroSectionProps = {
  onCtaClick?: () => void;
};

export function HeroSection({ onCtaClick }: HeroSectionProps) {
  const mouse = useRef({ x: -999, y: -999 });
  const smooth = useRef({ x: -999, y: -999 });
  const rafRef = useRef<number | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const updatePosition = (clientX: number, clientY: number) => {
      mouse.current = { x: clientX, y: clientY };
    };

    const onMouseMove = (e: MouseEvent) => updatePosition(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) updatePosition(touch.clientX, touch.clientY);
    };

    const tick = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.1;
      setCursorPos({ x: smooth.current.x, y: smooth.current.y });
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden h-screen bg-black font-sans"
      style={{ height: "100dvh" }}
    >
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat z-10 hero-zoom"
        style={{ backgroundImage: `url(${BG_IMAGE_1})` }}
        aria-hidden
      />

      <RevealLayer
        image={BG_IMAGE_2}
        cursorX={cursorPos.x}
        cursorY={cursorPos.y}
        radius={SPOTLIGHT_R}
      />

      <MarketingNav />

      <div className="absolute top-[14%] left-0 right-0 flex flex-col items-center text-center px-5 pointer-events-none z-50">
        <h1 className="text-white leading-[0.95]">
          <span
            className="block font-playfair italic font-normal text-5xl sm:text-7xl md:text-8xl hero-anim hero-reveal"
            style={{ letterSpacing: "-0.05em", animationDelay: "0.25s" }}
          >
            Your market holds
          </span>
          <span
            className="block font-normal text-5xl sm:text-7xl md:text-8xl -mt-1 hero-anim hero-reveal"
            style={{ letterSpacing: "-0.08em", animationDelay: "0.42s" }}
          >
            stories worth ranking
          </span>
        </h1>
      </div>

      <div
        className="hidden sm:block absolute bottom-14 left-10 md:left-14 max-w-[260px] z-50 pointer-events-none hero-anim hero-fade"
        style={{ animationDelay: "0.7s" }}
      >
        <p className="text-sm text-white/80 leading-relaxed">
          Every published article compounds — building search visibility, audience trust, and
          pipeline from topics your market already cares about.
        </p>
      </div>

      <div
        className="absolute bottom-10 sm:bottom-24 left-5 right-5 sm:left-auto sm:right-10 md:right-14 max-w-full sm:max-w-[260px] flex flex-col items-start gap-4 sm:gap-5 z-50 hero-anim hero-fade"
        style={{ animationDelay: "0.85s" }}
      >
        <p className="text-xs sm:text-sm text-white/80 leading-relaxed pointer-events-none">
          Peel back the plan: custom roadmaps, persona-driven articles, and one-click publishing
          to the CMS you already use.
        </p>
        <button
          type="button"
          onClick={onCtaClick}
          className="bg-[#e8702a] hover:bg-[#d2611f] text-white text-sm font-medium px-7 py-3 rounded-full transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-[#e8702a]/30"
        >
          Build your roadmap
        </button>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 hero-bridge pointer-events-none z-40"
        aria-hidden
      />
    </section>
  );
}
