import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AutomationSetupForm } from "@/components/communications/automation-setup-form";
import { TemplateFields } from "@/components/communications/template-editor";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { listCommunicationAutomationReviewerOptions } from "@/lib/communications/automations";
import {
  DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE,
  JOINING_NEVER_GIVEN_TEMPLATE_KEY,
} from "@/lib/communications/templates";
import { listSavedListViews } from "@/lib/list-views/saved-views";

export const metadata = {
  title: "Create Communication Workflow",
};

export default async function NewCommunicationAutomationPage() {
  const formId = "create-workflow-form";
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const [peopleSegments, reviewerOptions] = await Promise.all([
    listSavedListViews("PEOPLE", accessState.user),
    listCommunicationAutomationReviewerOptions(accessState.user),
  ]);
  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active="communications" canManageSettings canManageTools />
      <main className="grid h-[calc(100vh-56px)] grid-rows-[auto_minmax(0,1fr)] bg-app-background">
        <header className="flex min-h-16 items-center justify-between border-b border-app-border bg-white px-4 sm:px-6">
          <Link
            className="inline-flex min-h-9 items-center gap-2 text-[15px] font-semibold text-app-foreground hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href="/communications"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Create Workflow
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
              templateFields={{
                ...DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE,
                format: "react-email-editor",
              }}
              templateKey={JOINING_NEVER_GIVEN_TEMPLATE_KEY}
            />
          </section>

          <aside className="min-h-0 overflow-y-auto border-t border-app-border bg-app-surface p-4 lg:border-l lg:border-t-0">
            <AutomationSetupForm
              defaultReviewerUserIds={[accessState.user.id]}
              formId={formId}
              reviewerOptions={reviewerOptions}
              segments={peopleSegments}
              templateFields={{
                ...DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE,
                format: "react-email-editor",
              }}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}
