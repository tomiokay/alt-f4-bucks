import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import type { StoreItem } from "@/lib/types";

type Props = {
  items: StoreItem[];
};

export function StoreGrid({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No items in the store right now. Check back later!
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{item.name}</CardTitle>
              {item.stock !== null && item.stock <= 3 && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {item.stock} left
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground">
              {item.description || "No description."}
            </p>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-4">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium tabular-nums">
                {item.price.toLocaleString()}
              </span>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/store/${item.id}`}>View</Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
