import type { ReactNode } from "react";

export type SectionLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

export type SectionTab = {
  label: string;
  to: string;
  exact?: boolean;
};

export type SectionProject = {
  id: number | string;
  name: string;
  url?: string;
};
