import { describe, expect, it, vi } from "vitest";
import { RockClient } from "@/lib/rock/client";

const member = {
  Id: 100,
  GroupId: 20,
  PersonId: 1,
  GroupMemberStatus: 1,
  IsArchived: true,
};
function client(body: unknown, status = 200) {
  const fetcher = vi.fn(async () => Response.json(body, { status }));
  return {
    fetcher,
    rock: new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "synthetic-key",
      fetcher: fetcher as typeof fetch,
    }),
  };
}

describe("verified group member GET by ID", () => {
  it("reads archive state without retaining unrelated response fields", async () => {
    const { rock, fetcher } = client({
      ...member,
      Person: { Email: "synthetic@example.test" },
    });
    await expect(rock.getGroupMember(100)).resolves.toEqual(member);
    expect(fetcher).toHaveBeenCalledWith(
      "https://rock.example.test/api/GroupMembers/100",
      expect.objectContaining({ method: "GET" }),
    );
  });
  it.each([
    null,
    {},
    { ...member, Id: 101 },
    { ...member, IsArchived: undefined },
    { ...member, IsArchived: "false" },
    { ...member, GroupMemberStatus: "Active" },
  ])("rejects incomplete or incompatible payloads", async (body) => {
    await expect(client(body).rock.getGroupMember(100)).rejects.toThrow(
      "verified read contract",
    );
  });
  it.each([403, 404, 503])(
    "does not turn HTTP %i into a source deletion",
    async (status) => {
      await expect(
        client({ private: "not logged" }, status).rock.getGroupMember(100),
      ).rejects.toThrow(`status ${status}`);
    },
  );
  it.each([0, -1, NaN, 1.5])(
    "rejects an invalid identifier before fetching",
    async (id) => {
      const { rock, fetcher } = client(member);
      await expect(rock.getGroupMember(id)).rejects.toThrow("positive integer");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
