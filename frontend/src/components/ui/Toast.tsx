import { create } from "zustand";
import { useEffect } from "react";

interface ToastItem { id: number; title: string; description?: string; kind: "success" | "error" | "info" }

interface State {
  items: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToast = create<State>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items, { ...t, id: ++counter }] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export function toast(title: string, description?: string, kind: ToastItem["kind"] = "success") {
  useToast.getState().push({ title, description, kind });
}

export function ToastStack() {
  const { items, remove } = useToast();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {items.map((t) => <ToastView key={t.id} item={t} onClose={() => remove(t.id)} />)}
    </div>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const accent = item.kind === "error" ? "border-l-red-500"
    : item.kind === "info" ? "border-l-ink-700"
    : "border-l-emerald-500";

  return (
    <div className={`bg-white shadow-card rounded-xl border border-cream-200 border-l-4 ${accent} pl-4 pr-5 py-3 min-w-[280px] max-w-sm`}>
      <div className="text-sm font-medium text-ink-700">{item.title}</div>
      {item.description && (
        <div className="text-xs text-ink-400 mt-0.5">{item.description}</div>
      )}
    </div>
  );
}
