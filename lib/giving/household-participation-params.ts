import { GraphQLError } from "graphql";
import {
  participationInputSchema,
  type ParticipationInput,
} from "./household-participation-contract";

export function participationFromParams(
  params: Record<string, string | string[] | undefined>,
): ParticipationInput {
  const value = (key: string) =>
    typeof params[key] === "string" ? params[key] : undefined;
  const campus = value("campuses");
  const funds = params.funds;
  const parsed = participationInputSchema.safeParse({
    months: value("months") ? Number(value("months")) : undefined,
    asOf: value("asOf"),
    campusRockIds:
      campus === undefined
        ? undefined
        : campus === ""
          ? []
          : campus
              .split(",")
              .map((v) => (v === "unassigned" ? null : Number(v))),
    fundRockIds:
      funds === undefined
        ? undefined
        : (Array.isArray(funds) ? funds : funds.split(","))
            .filter((v) => v !== "")
            .map(Number),
    stage: value("stage"),
    christianStatus: value("christianStatus") || undefined,
    giving: value("giving"),
    recordedGivers: value("recordedGivers"),
    reviewOnly: value("reviewOnly") === "true",
    after: value("after") ? Number(value("after")) : undefined,
    snapshotId: value("snapshotId"),
  });
  if (!parsed.success)
    throw new GraphQLError("Household participation filters are invalid.", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  return parsed.data;
}
export function participationHref(
  filters: ParticipationInput,
  overrides: Partial<ParticipationInput> = {},
) {
  const input = { ...filters, ...overrides };
  const params = new URLSearchParams();
  for (const key of [
    "months",
    "asOf",
    "stage",
    "christianStatus",
    "giving",
    "recordedGivers",
    "after",
    "snapshotId",
  ] as const)
    if (input[key] !== undefined) params.set(key, String(input[key]));
  if (input.campusRockIds !== undefined)
    params.set(
      "campuses",
      input.campusRockIds.map((v) => (v === null ? "unassigned" : v)).join(","),
    );
  if (input.fundRockIds !== undefined)
    params.set("funds", input.fundRockIds.join(","));
  if (input.reviewOnly) params.set("reviewOnly", "true");
  return `/households/participation?${params.toString()}`;
}
