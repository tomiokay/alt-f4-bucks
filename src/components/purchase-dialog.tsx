"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { purchaseItem } from "@/app/actions/purchases";
import type { StoreItem } from "@/lib/types";

type Props = {
  item: StoreItem;
  balance: number;
};

export function PurchaseDialog({ item, balance }: Props) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = item.price * quantity;
  const canAfford = balance >= total;
  const inStock = item.stock === null || item.stock >= quantity;

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("quantity", String(quantity));

    const result = await purchaseItem(formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setQuantity(1);
      }, 1500);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Purchase</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>
            Buy {item.name} for {item.price.toLocaleString()} Alt-F4 Bucks each.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-sm text-emerald-600">
            Purchase successful!
          </div>
        ) : (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={item.stock ?? 99}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium tabular-nums">
                  {total.toLocaleString()} Bucks
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Your balance</span>
                <span className="font-mono tabular-nums">
                  {balance.toLocaleString()} Bucks
                </span>
              </div>
              {!canAfford && (
                <p className="text-sm text-red-600">
                  You don&apos;t have enough Bucks for this purchase.
                </p>
              )}
              {!inStock && (
                <p className="text-sm text-red-600">
                  Not enough stock available.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || !canAfford || !inStock}
              >
                {loading ? "Processing..." : "Confirm Purchase"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
