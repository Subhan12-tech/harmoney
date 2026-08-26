import { notFound } from "next/navigation";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/data";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { TeamMembers } from "@/components/app/TeamMembers";
import { ProfilePanel } from "@/components/app/settings/ProfilePanel";
import { OrganizationPanel } from "@/components/app/settings/OrganizationPanel";
import { SecurityPanel } from "@/components/app/settings/SecurityPanel";
import { ApiPanel } from "@/components/app/settings/ApiPanel";
import { BillingPanel } from "@/components/app/settings/BillingPanel";
import { IntegrationsPanel } from "@/components/app/settings/IntegrationsPanel";

/** Each settings section is a real, prerendered URL. */
export function generateStaticParams() {
  return SETTINGS_TABS.map((tab) => ({ tab: tab.key }));
}

export default function SettingsPage({ params }: { params: { tab: string } }) {
  const tab = SETTINGS_TABS.find((t) => t.key === params.tab);
  if (!tab) notFound();

  const key = tab.key as SettingsTab;

  return (
    <>
      <SettingsTabs active={key} />

      {key === "profile" && <ProfilePanel />}
      {key === "org" && <OrganizationPanel />}
      {key === "members" && <TeamMembers compact />}
      {key === "security" && <SecurityPanel />}
      {key === "api" && <ApiPanel />}
      {key === "billing" && <BillingPanel />}
      {key === "integrations" && <IntegrationsPanel />}
    </>
  );
}
