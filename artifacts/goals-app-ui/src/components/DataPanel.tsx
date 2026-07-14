import type { ReactNode } from "react";

export function DataPanel({
  title,
  empty,
  error,
  children,
}: {
  title: string;
  empty?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      {error ? <p className="text-sm text-red-700 mb-2">{error}</p> : null}
      <div className="rounded-xl border border-(--border) bg-white divide-y">
        {children}
        {empty ? <p className="p-4 text-sm text-(--muted)">{empty}</p> : null}
      </div>
    </section>
  );
}

export function DataRow({
  primary,
  secondary,
  href,
}: {
  primary: string;
  secondary?: string;
  href?: string;
}) {
  const className = "flex justify-between gap-4 px-4 py-3 text-sm";
  const body = (
    <>
      <span className="font-medium truncate">{primary}</span>
      {secondary ? <span className="text-(--muted) shrink-0">{secondary}</span> : null}
    </>
  );
  if (href) {
    return (
      <a href={href} className={`${className} hover:bg-[#f5f3ef]`}>
        {body}
      </a>
    );
  }
  return <div className={className}>{body}</div>;
}
