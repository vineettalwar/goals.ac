"use client";

import { Suspense } from "react";
import WordPressPage from "./page";

export default function WordPressPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <WordPressPage />
    </Suspense>
  );
}
