/** Minimal above-the-fold rules so the masthead paints before external CSS chunks load. */
export const MARKETING_CRITICAL_CSS = `
:root{--font-sans-face:"IBM Plex Sans",system-ui,-apple-system,sans-serif;--font-serif-face:"Source Serif 4",Georgia,serif;--font-mono-face:"IBM Plex Mono",monospace;--signal:#d97706;--ink:#0a0a0b;--newsprint:#f3efe6;--border:#c9c2b4}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:var(--font-sans-face);background:var(--newsprint);color:var(--ink);-webkit-font-smoothing:antialiased}
.min-h-screen{min-height:100vh;min-height:100dvh}
.flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1 1 0%}.w-full{width:100%}
.bg-background{background:#F3EFE6}.text-foreground{color:#0A0A0B}
.font-sans{font-family:var(--font-sans-face)}
h1{margin:0;line-height:1.08;font-size:3rem;font-weight:700}
.header-masthead{padding:3rem 0}
`.replace(/\s+/g, " ").trim();
