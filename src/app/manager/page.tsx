import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Filter out the current manager from the member list for awards
  const members = allProfiles.filter((p) => p.id !== profile.id);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">Manager Panel</h1>
        <p className="text-sm text-muted-foreground">
          Award bucks, manage the store, and review all transactions.
        </p>
      </div>

      <Tabs defaultValue="award" className="space-y-4">
        <TabsList>
          <TabsTrigger value="award">Award Bucks</TabsTrigger>
          <TabsTrigger value="store">Store Items</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="award">
          <div className="max-w-md">
            <AwardForm members={members} />
          </div>
        </TabsContent>

        <TabsContent value="store">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Store Management</CardTitle>
            </CardHeader>
            <CardContent>
              <StoreManagement items={storeItems} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLog members={allProfiles} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
