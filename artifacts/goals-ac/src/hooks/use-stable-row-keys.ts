import { useEffect, useState } from "react";

/** Stable React keys for dynamic string lists (append/remove rows). */
export function useStableRowKeys(length: number): string[] {
  const [keys, setKeys] = useState<string[]>([]);

  useEffect(() => {
    setKeys((prev) => {
      if (prev.length < length) {
        return [
          ...prev,
          ...Array.from({ length: length - prev.length }, () => crypto.randomUUID()),
        ];
      }
      if (prev.length > length) {
        return prev.slice(0, length);
      }
      return prev;
    });
  }, [length]);

  return keys;
}
