"use client";

type HeroPhotoBgProps = {
  image: string;
  overlayClass?: string;
  animate?: boolean;
};

/** Same visual treatment as PageHero: cover photo + dark wash. */
export function HeroPhotoBg({ image, overlayClass = "bg-black/55", animate = false }: HeroPhotoBgProps) {
  return (
    <>
      <div
        className={`absolute inset-0 bg-center bg-cover bg-no-repeat z-0 ${animate ? "hero-zoom" : ""}`}
        style={{ backgroundImage: `url(${image})` }}
        aria-hidden
      />
      <div className={`absolute inset-0 z-0 ${overlayClass}`} aria-hidden />
    </>
  );
}
