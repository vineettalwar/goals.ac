import type { Metadata } from "next";
import { ContactPageDynamic } from "@/components/marketing/layout/marketing-client-dynamic";

export const metadata: Metadata = {
  title: "Contact | goals.ac",
  description: "Book a demo or get in touch with the goals.ac team.",
};

export default function Page() {
  return <ContactPageDynamic />;
}
