export const ROCK_FULL_SYNC_QUEUE = "rock-full-sync";
export const ROCK_FULL_SYNC_SCHEDULE_KEY = "default-rock-full-sync";
export const ROCK_PERSON_SYNC_QUEUE = "rock-person-sync";
export const ROCK_PERSON_SYNC_SCHEDULE_KEY = "default-rock-person-sync";
export const GIVING_DERIVED_REFRESH_QUEUE = "giving-derived-refresh";
export const COMMUNICATION_AUTOMATION_EVALUATE_QUEUE =
  "communication-automation-evaluate";
export const COMMUNICATION_AUTOMATION_NOTICE_QUEUE =
  "communication-automation-notice";

export const JOB_DASHBOARD_QUEUES = [
  ROCK_FULL_SYNC_QUEUE,
  ROCK_PERSON_SYNC_QUEUE,
  GIVING_DERIVED_REFRESH_QUEUE,
  COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
  COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
] as const;

export type JobsDashboardQueueName = (typeof JOB_DASHBOARD_QUEUES)[number];
