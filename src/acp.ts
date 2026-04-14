import { sflow } from "sflow";
import type { AgentSideConnection } from "@agentclientprotocol/sdk";
import type { Chunk } from "./chunk.js";
import { json } from "./chunk.js";
import { createProcessor, type ProcessorHandle } from "./processor.js";
import type { FlowFn } from "./node.js";

type SessionNotification = Parameters<AgentSideConnection["sessionUpdate"]>[0];

async function* acpSourceIter(conn: AgentSideConnection): AsyncIterable<Chunk> {
  const queue: Chunk[] = [];
  let notifyReady: (() => void) | null = null;
  let done = false;

  const enqueue = (chunk: Chunk) => {
    queue.push(chunk);
    notifyReady?.();
    notifyReady = null;
  };

  conn.signal.addEventListener("abort", () => {
    done = true;
    notifyReady?.();
    notifyReady = null;
  });

  (conn as unknown as {
    on?: (event: string, fn: (params: unknown) => void) => void;
  }).on?.("sessionUpdate", (params: unknown) => {
    enqueue(json(params as SessionNotification));
  });

  while (!done || queue.length > 0) {
    if (queue.length === 0) {
      await new Promise<void>((r) => { notifyReady = r; });
    }
    const chunk = queue.shift();
    if (chunk !== undefined) yield chunk;
  }
}

export function acpSource(conn: AgentSideConnection): AsyncIterable<Chunk> {
  return acpSourceIter(conn);
}

export function acpSink(conn: AgentSideConnection): (iter: AsyncIterable<Chunk>) => Promise<void> {
  return async (iter: AsyncIterable<Chunk>): Promise<void> => {
    for await (const chunk of iter) {
      if (chunk.type === "json") {
        await conn.sessionUpdate(chunk.data as SessionNotification);
      } else {
        const sessionId = (chunk.meta?.["sessionId"] as string | undefined) ?? "";
        await conn.sessionUpdate({
          sessionId,
          update: {
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: JSON.stringify(chunk.data) }],
          },
        } as SessionNotification);
      }
    }
  };
}

export function acpProcessor<I extends Chunk, O extends Chunk>(
  conn: AgentSideConnection,
  name: string,
  transform: FlowFn<I, O>,
): ProcessorHandle<I, O> {
  const input = acpSource(conn) as AsyncIterable<Chunk>;

  const handle = createProcessor<I, O>({
    name,
    input,
    transform,
  });

  conn.signal.addEventListener("abort", () => handle.stop());

  const sink = acpSink(conn);
  void sink(handle.output as AsyncIterable<Chunk>).catch((e: unknown) => {
    handle.state.send({ type: "ERROR", message: String(e) });
  });

  return handle;
}
