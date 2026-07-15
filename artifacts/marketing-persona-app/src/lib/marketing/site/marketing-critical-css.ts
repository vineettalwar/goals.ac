/** Minimal above-the-fold rules so the hero paints before external CSS chunks load. */
export const MARKETING_CRITICAL_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#000;color:#fff;font-family:var(--font-jakarta,'Plus Jakarta Sans',system-ui,sans-serif);-webkit-font-smoothing:antialiased}
.min-h-screen{min-height:100vh;min-height:100dvh}
.flex{display:flex}
.flex-col{flex-direction:column}
.flex-1{flex:1 1 0%}
.relative{position:relative}
.overflow-hidden{overflow:hidden}
.w-full{width:100%}
.h-screen{height:100vh;height:100dvh}
.bg-black{background:#000}
.object-cover{object-fit:cover}
.z-10{z-index:10}
.z-20{z-index:20}
.z-40{z-index:40}
.z-50{z-index:50}
.text-white{color:#fff}
.pointer-events-none{pointer-events:none}
h1{margin:0;line-height:.95}
.font-sans{font-family:var(--font-jakarta,'Plus Jakarta Sans',system-ui,sans-serif)}
/* Do not apply bare .absolute — without offsets copy piles in the corner (CLS). */
.absolute.inset-0{position:absolute;inset:0}
/* Hide animated hero copy until full CSS positions + animates it. */
.hero-anim{opacity:0}
`.replace(/\s+/g, " ").trim();
