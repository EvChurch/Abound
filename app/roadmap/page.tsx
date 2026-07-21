import { redirect } from "next/navigation";

import { AppTopNav } from "@/components/navigation/app-top-nav";
import { RoadmapWorkspace } from "@/components/roadmap/roadmap-workspace";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";

export const metadata = {
  title: "Roadmap",
};

export default async function RoadmapPage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav active="roadmap" canManageSettings canManageTools />
      <RoadmapWorkspace />
    </main>
  );
}
