import { redirect } from "next/navigation";

/** `/app/settings` has no content of its own — it opens on Organization. */
export default function SettingsIndexPage() {
  redirect("/app/settings/org");
}
