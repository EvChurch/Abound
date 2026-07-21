import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { updateCommunicationAutomationAction } from "@/app/communications/actions";
import { AutomationSetupForm } from "@/components/communications/automation-setup-form";
import { TemplateFields } from "@/components/communications/template-editor";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  getCommunicationAutomation,
  listCommunicationAutomationReviewerOptions,
} from "@/lib/communications/automations";
import { listSavedListViews } from "@/lib/list-views/saved-views";

type EditCommunicationAutomationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({
  params,
}: EditCommunicationAutomationPageProps) {
  const { id } = await params;

  return {
    title: `Edit Communication ${id}`,
  };
}

export default async function EditCommunicationAutomationPage({
  params,
}: EditCommunicationAutomationPageProps) {
  const formId = "edit-workflow-template-form";
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { id } = await params;
  const automation = await getCommunicationAutomation(
    id,
    accessState.user,
  ).catch((error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "extensions" in error &&
      (error as { extensions?: { code?: string } }).extensions?.code ===
        "NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  });
  const [peopleSegments, reviewerOptions] = await Promise.all([
    listSavedListViews("PEOPLE", accessState.user),
    listCommunicationAutomationReviewerOptions(accessState.user),
  ]);
  const selectedReviewerIds =
    automation.reviewers.length > 0
      ? automation.reviewers.map((reviewer) => reviewer.reviewerUserId)
      : [accessState.user.id];

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active="communications" canManageSettings canManageTools />
      <main className="grid h-[calc(100vh-56px)] grid-rows-[auto_minmax(0,1fr)] bg-app-background">
        <header className="flex min-h-16 items-center justify-between border-b border-app-border bg-white px-4 sm:px-6">
          <Link
            className="inline-flex min-h-9 items-center gap-2 text-[15px] font-semibold text-app-foreground hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href={`/communications/${automation.id}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Edit Workflow
          </Link>
          <button
            className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            form={formId}
            type="submit"
          >
            Save
          </button>
        </header>

        <section className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_390px]">
          <section className="h-full min-h-0 overflow-hidden">
            <TemplateFields
              formId={formId}
              templateFields={automation.templateFields}
              templateKey={automation.templateKey}
            />
          </section>

          <aside className="min-h-0 overflow-y-auto border-t border-app-border bg-app-surface p-4 lg:border-l lg:border-t-0">
            <AutomationSetupForm
              action={updateCommunicationAutomationAction}
              automationId={automation.id}
              defaultName={automation.name}
              defaultCooldownDays={automation.cooldownDays}
              defaultRepeatSending={automation.suppressionMode}
              defaultReviewerUserIds={selectedReviewerIds}
              defaultSavedListViewId={automation.savedListViewId}
              defaultScheduleCron={automation.scheduleCron}
              formId={formId}
              reviewerOptions={reviewerOptions}
              segments={peopleSegments}
              templateFields={automation.templateFields}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
