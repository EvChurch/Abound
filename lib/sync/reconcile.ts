import type { SyncIssueSeverity } from "@prisma/client";

export type SyncIssueInput = {
  severity: SyncIssueSeverity;
  source: string;
  recordType?: string | null;
  rockId?: string | null;
  code: string;
  message: string;
  redactedDetail?: unknown;
};

export type SyncReconciliation = {
  issues: SyncIssueInput[];
  skipped: number;
};

export function issue(input: SyncIssueInput): SyncIssueInput {
  return input;
}
