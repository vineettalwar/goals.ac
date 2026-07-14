import { redirect } from "next/navigation";

export function generateStaticParams() {
  return [{ slug: "legacy" }];
}

export const dynamicParams = false;

/** Legacy case-study URLs. Customer stories are not published yet. */
export default function Page() {
  redirect("/success-stories");
}
