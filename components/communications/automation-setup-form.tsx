import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { createCommunicationAutomationFromSegmentAction } from "@/app/communications/actions";
import { RepeatSendingField } from "@/components/communications/repeat-sending-field";
import { ScheduleCronField } from "@/components/communications/schedule-cron-field";
import { TemplateMetadataFields } from "@/components/communications/template-editor";
import { CustomSelect } from "@/components/ui/custom-select";
import type { CommunicationAutomationReviewerOption } from "@/lib/communications/automations";
import type { SavedListViewRecord } from "@/lib/list-views/saved-views";

type AutomationSetupFormProps = {
  action?: (formData: FormData) => Promise<void>;
  automationId?: string;
  defaultName?: string;
  defaultReviewerUserIds?: string[];
  defaultSavedListViewId?: string;
  defaultScheduleCron?: string;
  defaultCooldownDays?: number | null;
  defaultRepeatSending?: "NEVER_RESEND" | "COOLDOWN" | "EVERY_RUN";
  formId?: string;
  reviewerOptions: CommunicationAutomationReviewerOption[];
  segments: SavedListViewRecord[];
  templateFields: Prisma.JsonValue;
};

export function AutomationSetupForm({
  action = createCommunicationAutomationFromSegmentAction,
  automationId,
  defaultName,
  defaultReviewerUserIds = [],
  defaultSavedListViewId,
  defaultScheduleCron = "0 9 * * 2",
  defaultCooldownDays,
  defaultRepeatSending = "NEVER_RESEND",
  formId,
  reviewerOptions,
  segments,
  templateFields,
}: AutomationSetupFormProps) {
  const selectedReviewerIds = new Set(defaultReviewerUserIds);

  if (segments.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-app-border bg-app-background px-4 py-3">
        <p className="text-[13px] leading-6 text-app-muted">
          No saved People segments yet.
        </p>
        <Link
          className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
          href="/people"
        >
          Create segment
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4" id={formId}>
      {automationId ? (
        <input name="id" type="hidden" value={automationId} />
      ) : null}
      <label className="grid gap-1">
        <span className="text-[12px] font-semibold text-app-muted">
          Workflow name
        </span>
        <input
          className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
          defaultValue={defaultName}
          name="name"
          placeholder="New member welcome"
          required
        />
      </label>
      <div className="grid gap-1">
        <span className="text-[12px] font-semibold text-app-muted">
          Segment
        </span>
        <CustomSelect
          ariaLabel="Segment"
          className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none transition hover:border-app-border-strong focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20"
          menuClassName="fixed z-30 max-h-80 overflow-y-auto rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
          defaultValue={defaultSavedListViewId}
          name="savedListViewId"
          options={segments.map((segment) => ({
            label: segment.name,
            value: segment.id,
          }))}
          rootClassName="relative w-full"
        />
      </div>
      <RepeatSendingField
        defaultCooldownDays={defaultCooldownDays}
        defaultValue={defaultRepeatSending}
      />
      <fieldset className="grid gap-2">
        <span className="text-[12px] font-semibold text-app-muted">
          Reviewers
        </span>
        <div className="grid gap-1 rounded-[6px] border border-app-border bg-app-background p-2">
          {reviewerOptions.map((reviewer) => (
            <label
              className="flex min-h-8 cursor-pointer items-center gap-2 rounded-[4px] px-2 text-[13px] text-app-foreground hover:bg-app-soft"
              key={reviewer.id}
            >
              <input
                className="size-4 accent-app-accent"
                defaultChecked={selectedReviewerIds.has(reviewer.id)}
                name="reviewerUserId"
                type="checkbox"
                value={reviewer.id}
              />
              <span>{reviewer.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <ScheduleCronField
        defaultValue={defaultScheduleCron}
        name="scheduleCron"
      />
      <div className="border-t border-app-border pt-4">
        <h2 className="text-[12px] font-semibold text-app-foreground">Email</h2>
      </div>
      <TemplateMetadataFields formId={formId} templateFields={templateFields} />
    </form>
  );
}
