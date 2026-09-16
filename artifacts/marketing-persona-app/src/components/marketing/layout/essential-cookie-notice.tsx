"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "goals_ac_cookie_ok";

export function EssentialCookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 px-4 py-3 text-sm text-white/80"
      role="region"
      aria-label="Cookie notice"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          We use essential session cookies only (TDDDG § 25). No ads. See the{" "}
          <Link className="underline" href="/cookies">
            cookie notice
          </Link>
          .
        </p>
        <button
          type="button"
          aria-label="Dismiss essential cookie notice"
          className="shrink-0 rounded border border-white/20 px-3 py-1.5 text-white hover:bg-white/10"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, "1");
            } catch {
              /* ignore quota */
            }
            setShow(false);
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
