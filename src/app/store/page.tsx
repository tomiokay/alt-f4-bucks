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
      <div>
        <h1 className="text-lg font-semibold text-foreground">Store</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Spend your Alt-F4 Bucks
        </p>
      </div>

      <StoreGrid items={items} />
    </div>
  );
}
