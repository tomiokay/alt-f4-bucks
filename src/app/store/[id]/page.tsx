import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getStoreItem } from "@/db/store";
import { ArrowLeft } from "lucide-react";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StoreItemPage({ params }: Props) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const [item, balance] = await Promise.all([
    getStoreItem(id),
    getUserBalance(profile.id),
  ]);

  if (!item || !item.active) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 text-xs text-muted-foreground">
        <Link href="/store">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Link>
      </Button>

      <div className="max-w-md rounded-lg border border-border/50 bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-base font-semibold text-foreground">{item.name}</h1>
          {item.stock !== null && (
            <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {item.stock} in stock
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {item.description || "No description available."}
        </p>

        <div className="space-y-2 rounded-md bg-secondary/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Price</span>
            <span className="font-mono font-bold text-foreground tabular-nums">
              ${item.price.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Your balance</span>
            <span className="font-mono text-foreground tabular-nums">
              ${balance.toLocaleString()}
            </span>
          </div>
        </div>

        <PurchaseDialog item={item} balance={balance} />
      </div>
    </div>
  );
}
