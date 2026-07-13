"use client";

import { useEffect } from "react";

export function WebVitalsReporter() {
  useEffect(() => {
    void import("web-vitals").then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const report = (metric: { name: string; value: number; rating: string; navigationType?: string }) => {
        void fetch("/api/analytics/vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            navigationType: metric.navigationType,
            path: window.location.pathname,
          }),
          keepalive: true,
        });
      };

      onCLS(report);
      onINP(report);
      onLCP(report);
      onFCP(report);
      onTTFB(report);
    });
  }, []);

  return null;
}
