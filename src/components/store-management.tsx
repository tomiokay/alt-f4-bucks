"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createStoreItem, toggleStoreItem } from "@/app/actions/store";
import type { StoreItem } from "@/lib/types";
import { Plus } from "lucide-react";

type Props = {
  items: StoreItem[];
};

export function StoreManagement({ items }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await createStoreItem(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setDialogOpen(false);
      setError(null);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setTogglingId(id);
    await toggleStoreItem(id, active);
    setTogglingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Store Item</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input name="name" required placeholder="Item name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  name="description"
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (Bucks)</Label>
                  <Input
                    name="price"
                    type="number"
                    min={0}
                    required
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">
                    Stock{" "}
                    <span className="text-xs text-muted-foreground">
                      (blank = unlimited)
                    </span>
                  </Label>
                  <Input
                    name="stock"
                    type="number"
                    min={0}
                    placeholder="∞"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL (optional)</Label>
                <Input
                  name="imageUrl"
                  type="url"
                  placeholder="https://..."
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No store items yet. Add one above.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.stock !== null ? item.stock : "∞"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.active ? "default" : "secondary"}>
                      {item.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={togglingId === item.id}
                      onClick={() => handleToggle(item.id, !item.active)}
                    >
                      {item.active ? "Deactivate" : "Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
