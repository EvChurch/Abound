"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  createMcpAccessToken,
  revokeMcpAccessToken,
} from "@/lib/mcp/access-tokens";

export type CreateMcpTokenState = {
  error?: string;
  plainTextToken?: string;
};

export async function createMcpTokenAction(
  _state: CreateMcpTokenState,
  formData: FormData,
): Promise<CreateMcpTokenState> {
  const actor = await requireStaffActor();
  const name = stringValue(formData, "name");

  if (!name) {
    return {
      error: "Name your token before creating it.",
    };
  }

  const created = await createMcpAccessToken({
    appUserId: actor.id,
    name,
  });

  revalidatePath("/tools/mcp");

  return {
    plainTextToken: created.plainTextToken,
  };
}

export async function revokeMcpTokenAction(formData: FormData) {
  const actor = await requireStaffActor();
  const tokenId = stringValue(formData, "tokenId");

  if (!tokenId) {
    throw new Error("tokenId is required.");
  }

  await revokeMcpAccessToken({
    appUserId: actor.id,
    tokenId,
  });

  revalidatePath("/tools/mcp");
}

async function requireStaffActor() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  return accessState.user;
}

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
