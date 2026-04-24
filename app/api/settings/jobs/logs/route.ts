import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { listJobWorkerEvents } from "@/lib/sync/worker-events";

const STREAM_POLL_INTERVAL_MS = 2000;
const HEARTBEAT_INTERVAL_MS = 15000;

export async function GET(request: Request) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status !== "authorized") {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!hasPermission(accessState.user.role, "settings:manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  let since = parseSince(sinceParam);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const write = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      const sendEvents = async () => {
        try {
          const events = await listJobWorkerEvents({
            limit: 200,
            since,
          });

          if (events.length === 0) {
            return;
          }

          const ordered = events
            .slice()
            .reverse()
            .map((event) => ({
              ...event,
              createdAt: event.createdAt.toISOString(),
            }));

          since = events[0]?.createdAt ?? since;
          write(`data: ${JSON.stringify(ordered)}\n\n`);
        } catch (error) {
          write(
            `event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : String(error) })}\n\n`,
          );
        }
      };

      write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);
      void sendEvents();

      const pollId = setInterval(() => {
        void sendEvents();
      }, STREAM_POLL_INTERVAL_MS);

      const heartbeatId = setInterval(() => {
        write(`: heartbeat ${Date.now()}\n\n`);
      }, HEARTBEAT_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(pollId);
        clearInterval(heartbeatId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}

function parseSince(input: string | null) {
  if (!input) {
    return new Date(Date.now() - 30 * 60 * 1000);
  }

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() - 30 * 60 * 1000);
  }

  return parsed;
}
