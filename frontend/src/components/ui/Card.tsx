import { HTMLAttributes } from "react";
import { classNames } from "@/lib/utils";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames("card p-6", className)} {...rest} />;
}

export function SectionTitle({ children, eyebrow }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6">
      {eyebrow && (
        <div className="text-[11px] tracking-widest uppercase text-ink-300 mb-2">{eyebrow}</div>
      )}
      <h2 className="text-3xl font-display text-ink-700">{children}</h2>
    </div>
  );
}
