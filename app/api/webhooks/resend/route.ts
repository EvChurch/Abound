import { NextResponse } from "next/server";

import {
  recordResendWebhookEvent,
  verifyResendWebhook,
} from "@/lib/communications/resend-sender";

export async function POST(request: Request) {
  const payload = await request.text();
  const headers = {
    id: request.headers.get("svix-id") ?? "",
    signature: request.headers.get("svix-signature") ?? "",
    timestamp: request.headers.get("svix-timestamp") ?? "",
  };

  if (!headers.id || !headers.signature || !headers.timestamp) {
    return NextResponse.json(
      { error: "Missing Resend webhook signature headers." },
      { status: 400 },
    );
  }

  try {
    const event = verifyResendWebhook(payload, headers);
    const result = await recordResendWebhookEvent(event);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Invalid Resend webhook signature." },
      { status: 401 },
    );
  }
}
