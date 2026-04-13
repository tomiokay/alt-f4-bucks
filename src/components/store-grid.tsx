import Link from "next/link";
import type { StoreItem } from "@/lib/types";

type Props = {
  items: StoreItem[];
};

export function StoreGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">No items available</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Check back later
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/store/${item.id}`}
          className="group rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-border"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-sm font-medium text-foreground group-hover:text-foreground">
              {item.name}
            </h3>
            {item.stock !== null && item.stock <= 3 && (
              <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {item.stock} left
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {item.description || "No description."}
          </p>
          <div className="text-sm font-bold font-mono tabular-nums text-foreground">
            ${item.price.toLocaleString()}
          </div>
        </Link>
      ))}
    </div>
  );
}
