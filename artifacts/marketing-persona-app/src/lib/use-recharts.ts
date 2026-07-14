"use client";

import { useEffect, useState } from "react";

export function useRechartsModule() {
  const [module, setModule] = useState<typeof import("recharts") | null>(null);

  useEffect(() => {
    void import("recharts").then(setModule);
  }, []);

  return module;
}
