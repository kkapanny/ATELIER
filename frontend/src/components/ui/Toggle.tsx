import { useState } from "react";
import { classNames } from "@/lib/utils";

export function Toggle({ defaultChecked = false, onChange }: { defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(defaultChecked);
  const toggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };
  return (
    <button
      onClick={toggle}
      className={classNames(
        "relative inline-flex h-6 w-11 rounded-full transition-colors",
        on ? "bg-ink-700" : "bg-cream-300",
      )}
    >
      <span
        className={classNames(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          on ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}
