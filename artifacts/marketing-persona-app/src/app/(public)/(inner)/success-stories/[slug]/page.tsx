import { redirect } from "next/navigation";

/** Placeholder for static export; no published stories yet. */
export function generateStaticParams() {
  return [{ slug: "legacy" }];
}

export const dynamicParams = false;

/** Detail routes activate when `PUBLISHED_STORIES` has entries. */
export default function Page() {
  redirect("/success-stories");
}
