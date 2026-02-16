import { notFound, redirect } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { PurchaseDialog } from "@/components/purchase-dialog";
import { getCurrentProfile } from "@/db/profiles";
import { getUserBalance } from "@/db/transactions";
import { getStoreItem } from "@/db/store";
import { ArrowLeft, Package } from "lucide-react";

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
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/store">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Store
        </Link>
      </Button>

      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{item.name}</CardTitle>
            {item.stock !== null && (
              <Badge variant="secondary">{item.stock} in stock</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {item.description || "No description available."}
          </p>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Price</span>
            </div>
            <span className="font-mono text-lg font-bold tabular-nums">
              {item.price.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your balance</span>
            <span className="font-mono text-sm tabular-nums">
              {balance.toLocaleString()} Bucks
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <PurchaseDialog item={item} balance={balance} />
        </CardFooter>
      </Card>
    </div>
  );
}
