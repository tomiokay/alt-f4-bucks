import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/db/profiles";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-[18px] font-semibold text-[#e6edf3]">Settings</h1>
        <p className="text-[12px] text-[#7d8590] mt-0.5">
          Update your profile and account settings
        </p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
