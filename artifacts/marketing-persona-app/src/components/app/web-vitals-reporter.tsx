"use client";

import { useReportWebVitals } from "next/web-vitals";

function reportWebVital(metric: {
  name: string;
  value: number;
  rating: string;
  navigationType?: string;
}) {
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
}

export function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
