import { APP_SHELL_PREFIXES, isAppShellPath } from "@/lib/middleware-paths";

/** Product app routes that may use ink-dark chrome. Marketing stays newsprint. */
export function isProductAppPath(pathname: string): boolean {
  return isAppShellPath(pathname) || pathname.startsWith("/admin");
}

/** Inline FOUC guard — same prefixes as isProductAppPath / isAppShellPath. */
export function productThemeBootScript(opts?: { marketingStatic?: boolean }): string {
  if (opts?.marketingStatic) {
    return `(function(){try{document.documentElement.classList.remove('dark');}catch(e){}})();`;
  }
  const prefixes = JSON.stringify([...APP_SHELL_PREFIXES, "/admin"]);
  return `(function(){try{var p=location.pathname||'';var prefixes=${prefixes};var app=false;for(var i=0;i<prefixes.length;i++){if(p===prefixes[i]||p.indexOf(prefixes[i]+'/')===0){app=true;break;}}if(!app&&p!=='/integrations/ai'&&p.indexOf('/integrations/ai/')!==0&&p!=='/integrations/tools'&&p.indexOf('/integrations/tools/')!==0){document.documentElement.classList.remove('dark');return;}var s=localStorage.getItem('theme');if(s!=='light'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
}
