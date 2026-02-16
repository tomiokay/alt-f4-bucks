import { redirect } from "next/navigation";
import { StoreGrid } from "@/components/store-grid";
import { getCurrentProfile } from "@/db/profiles";
import { getActiveStoreItems } from "@/db/store";

export default async function StorePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const items = await getActiveStoreItems();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Store</h1>
        <p className="text-sm text-muted-foreground">
          Browse items and spend your Alt-F4 Bucks.
        </p>
      </div>

      <StoreGrid items={items} />
    </div>
  );
}
