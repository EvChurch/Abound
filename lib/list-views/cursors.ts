import { GraphQLError } from "graphql";

export type RockIdCursor = {
  rockId: number;
};

export function encodeRockIdCursor(cursor: RockIdCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeRockIdCursor(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<RockIdCursor>;

    if (!Number.isInteger(parsed.rockId) || parsed.rockId! <= 0) {
      throw new Error("Invalid cursor rockId");
    }

    return {
      rockId: parsed.rockId!,
    };
  } catch {
    throw new GraphQLError("List cursor is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}

export function clampListLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return 50;
  }

  return Math.min(Math.trunc(limit), 100);
}
