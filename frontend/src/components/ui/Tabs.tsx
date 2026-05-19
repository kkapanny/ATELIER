import { ReactNode, useState } from "react";
import { classNames } from "@/lib/utils";

interface TabItem { id: string; label: string; content: ReactNode }

export function Tabs({ items, defaultId }: { items: TabItem[]; defaultId?: string }) {
  const [active, setActive] = useState(defaultId ?? items[0]?.id);
  return (
    <div>
      <nav className="flex gap-6 border-b border-cream-200 mb-6">
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={classNames(
              "pb-3 text-sm tracking-wide transition-colors",
              active === t.id
                ? "text-ink-700 border-b-2 border-ink-700"
                : "text-ink-300 hover:text-ink-500",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div>{items.find((t) => t.id === active)?.content}</div>
    </div>
  );
}
