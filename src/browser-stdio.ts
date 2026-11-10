import type { Chunk, ChunkType } from "./chunk-types.js";
import { encodeChunk, decodeChunk } from "./codec.js";
import { createProcessor, type ProcessorHandle } from "./processor.js";

export type BrowserStdio = {
  input: (line: string) => Promise<string>;
  endpoints: Map<string, (message: unknown) => Promise<unknown> | unknown>;
  attach: (name: string, handler: (message: unknown) => Promise<unknown> | unknown) => () => void;
  close: () => void;
  output?: ProcessorHandle;
};

const enc = new TextEncoder();
const dec = new TextDecoder();

export type BrowserStdioConfig = {
  name: string;
  inputType?: ChunkType;
  stream?: boolean;
  transform?: (flow: never) => unknown;
};

export function createBrowserStdio(config: BrowserStdioConfig = { name: "browser-stdio" }): BrowserStdio {
  const inputType = config.inputType ?? "rpc";
  const endpoints = new Map<string, (message: unknown) => Promise<unknown> | unknown>();
  let closing = false;
  let wake: (() => void) | null = null;
  const pending: Chunk[] = [];
  let output: ProcessorHandle | undefined;

  if (config.stream) {
    async function* incoming(): AsyncIterable<Chunk> {
      while (!closing) {
        const next = pending.shift();
        if (next) { yield next; continue; }
        await new Promise<void>((done) => { wake = done; });
        wake = null;
      }
    }
    output = createProcessor({
      name: config.name,
      input: incoming() as AsyncIterable<Chunk>,
      transform: (flow) => flow,
    });
    (async () => { for await (const chunk of output!.output) void chunk; })().catch(() => {});
  }

  async function deliver(chunk: Chunk): Promise<string> {
    const raw = chunk.data as unknown;
    const items = Array.isArray(raw) ? raw : [raw];
    const answers: string[] = [];
    for (const item of items) {
      const record = (item ?? {}) as Record<string, unknown>;
      const meta = (record.meta ?? {}) as Record<string, unknown>;
      const params = (record.params ?? {}) as Record<string, unknown>;
      const target = meta.target ?? params.name;
      const parts = typeof target === "string" ? target.split("_") : [];
      const handler = (typeof target === "string" ? endpoints.get(target) : undefined)
        ?? (parts.length ? endpoints.get(parts[0]!) : undefined);
      if (!handler) {
        answers.push(JSON.stringify({ jsonrpc: "2.0", id: record.id ?? null, error: { code: -32601, message: `no endpoint for ${String(target ?? "request")}` } }));
        continue;
      }
      const answer = await handler(record);
      if (answer === undefined) continue;
      answers.push(dec.decode(encodeChunk({ type: "rpc", data: answer } as Chunk)).trim());
    }
    return answers.join("\n");
  }

  return {
    async input(line: string): Promise<string> {
      const chunk = decodeChunk(inputType, enc.encode(line));
      if (config.stream) {
        pending.push(chunk);
        wake?.();
      }
      return deliver(chunk);
    },
    endpoints,
    attach(name, handler) {
      endpoints.set(name, handler);
      return () => endpoints.delete(name);
    },
    close() {
      closing = true;
      wake?.();
    },
    ...(output ? { output } : {}),
  };
}
