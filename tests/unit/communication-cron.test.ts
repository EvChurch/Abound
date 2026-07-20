import { describe, expect, it } from "vitest";

import {
  describeCommunicationCron,
  nextCommunicationCronDate,
} from "@/lib/communications/cron";

describe("communication cron descriptions", () => {
  it("describes the default weekly schedule in New Zealand time", () => {
    expect(describeCommunicationCron("0 9 * * 2")).toEqual({
      description: "Runs every Tuesday at 9:00 AM New Zealand time.",
      isValid: true,
      value: "0 9 * * 2",
    });
  });

  it("describes daily and monthly schedules", () => {
    expect(describeCommunicationCron("30 14 * * *")).toMatchObject({
      description: "Runs daily at 2:30 PM New Zealand time.",
      isValid: true,
    });
    expect(describeCommunicationCron("15 8 1 * *")).toMatchObject({
      description: "Runs monthly on day 1 at 8:15 AM New Zealand time.",
      isValid: true,
    });
  });

  it("rejects malformed cron schedules", () => {
    expect(describeCommunicationCron("0 25 * * *")).toMatchObject({
      isValid: false,
      message: "The hour value must be between 0 and 23.",
    });
    expect(describeCommunicationCron("0 9 * *")).toMatchObject({
      isValid: false,
      message: "Use five cron fields: minute hour day month weekday.",
    });
  });

  it("finds the next scheduled New Zealand run time", () => {
    expect(
      nextCommunicationCronDate(
        "0 9 * * 2",
        new Date("2026-07-19T21:30:00.000Z"),
      ).toISOString(),
    ).toBe("2026-07-20T21:00:00.000Z");
  });

  it("finds the next daily scheduled time after today's run has passed", () => {
    expect(
      nextCommunicationCronDate(
        "30 14 * * *",
        new Date("2026-07-19T03:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-07-20T02:30:00.000Z");
  });
});
