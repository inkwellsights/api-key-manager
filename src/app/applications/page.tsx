import { listApplications } from "@/server/applications";
import { ApplicationsManager } from "@/components/applications/ApplicationsManager";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const apps = await listApplications();

  return <ApplicationsManager apps={apps} />;
}
