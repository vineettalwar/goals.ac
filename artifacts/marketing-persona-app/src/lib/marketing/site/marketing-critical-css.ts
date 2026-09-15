/** Minimal above-the-fold rules so the masthead paints before external CSS chunks load. */
export const MARKETING_CRITICAL_CSS = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#F3EFE6;color:#0A0A0B;font-family:var(--font-sans-face,'IBM Plex Sans',system-ui,sans-serif);-webkit-font-smoothing:antialiased}
.min-h-screen{min-height:100vh;min-height:100dvh}
.flex{display:flex}
.flex-col{flex-direction:column}
.flex-1{flex:1 1 0%}
.w-full{width:100%}
.bg-background{background:#F3EFE6}
.text-foreground{color:#0A0A0B}
.font-sans{font-family:var(--font-sans-face,'IBM Plex Sans',system-ui,sans-serif)}
h1{margin:0;line-height:1.08}
`.replace(/\s+/g, " ").trim();
