import type { ReactNode } from "react";

export type SectionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type SectionTab = {
  label: string;
  to: string;
};

export type SectionProject = {
  id: number | string;
  name: string;
  url?: string;
};
