import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AwardForm } from "@/components/award-form";
import { StoreManagement } from "@/components/store-management";
import { AuditLog } from "@/components/audit-log";
import { getCurrentProfile, getAllProfiles } from "@/db/profiles";
import { getAllStoreItems } from "@/db/store";

export default async function ManagerPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["manager", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [allProfiles, storeItems] = await Promise.all([
    getAllProfiles(),
    getAllStoreItems(),
  ]);

  const members = allProfiles;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Manager</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Award bucks, manage store, review transactions
        </p>
      </div>

      <Tabs defaultValue="award" className="space-y-4">
        <TabsList className="bg-secondary border-0">
          <TabsTrigger value="award">Award</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="award">
          <div className="max-w-md">
            <AwardForm members={members} />
          </div>
        </TabsContent>

        <TabsContent value="store">
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <StoreManagement items={storeItems} />
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <div className="rounded-lg border border-border/50 bg-card p-5">
            <AuditLog members={allProfiles} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
