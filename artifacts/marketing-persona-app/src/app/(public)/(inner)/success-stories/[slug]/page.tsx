import { redirect } from "next/navigation";

/** Legacy case-study URLs. Customer stories are not published yet. */
export default function Page() {
  redirect("/success-stories");
}
