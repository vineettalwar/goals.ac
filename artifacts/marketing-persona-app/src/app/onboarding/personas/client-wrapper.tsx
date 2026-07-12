"use client";

import { Suspense } from "react";
import PersonasPage from "./page";

export default function PersonasPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <PersonasPage />
    </Suspense>
  );
}
