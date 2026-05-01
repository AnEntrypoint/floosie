import mri from "mri";
import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk, encodeChunk } from "./codec.js";
import { fileSource, fileSink } from "./file.js";
import { autoDecodeAsync } from "./auto.js";
import { wsSource, wsSink, wsBridge, muxWsClients, type LoadBalanceStrategy } from "./ws.js";

type Args = { _: string[]; [k: string]: string | boolean | string[] | undefined };

const HELP = `floosie — universal stream pipe

Usage:
  floosie <command> [options]

Commands:
  pipe      Read source, transform, write sink
  bridge    Run a WebSocket bridge server
  mux       Mux N upstream WS endpoints into stdout/stdin
  inspect   Print chunk metadata for a file or stdin
  help      Show this help

Sources/sinks (--in / --out):
  file:<path>          Read/write file (auto-detect mime)
  ws:<url>             WebSocket source/sink
  stdio                stdin/stdout (default)

Examples:
  cat data.json | floosie pipe --in stdio --type json --out file:out.ndjson
  floosie pipe --in file:image.png --out ws://localhost:7878
  floosie bridge --port 7878
  floosie mux --urls ws://a:7878,ws://b:7878 --strategy round-robin
  floosie inspect data.bin
`;

function ndjsonStdoutSink(): (iter: AsyncIterable<Chunk>) => Promise<void> {
  return async (iter) => {
    for await (const chunk of iter) {
      process.stdout.write(JSON.stringify(chunk) + "\n");
    }
  };
}

async function* stdinNdjsonSource(): AsyncIterable<Chunk> {
  const dec = new TextDecoder();
  let buf = "";
  for await (const raw of process.stdin as AsyncIterable<Uint8Array>) {
    buf += dec.decode(raw, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as Chunk;
  }
  if (buf.trim()) yield JSON.parse(buf) as Chunk;
}

async function* stdinTypedSource(type: ChunkType): AsyncIterable<Chunk> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  for await (const raw of process.stdin as AsyncIterable<Uint8Array>) {
    buf += dec.decode(raw, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) yield decodeChunk(type, enc.encode(line));
  }
  if (buf.trim()) yield decodeChunk(type, enc.encode(buf));
}

function resolveSource(spec: string, type?: ChunkType): AsyncIterable<Chunk> {
  if (spec === "stdio" || spec === "-" || !spec) {
    return type ? stdinTypedSource(type) : stdinNdjsonSource();
  }
  if (spec.startsWith("file:")) return fileSource(spec.slice(5), type);
  if (spec.startsWith("ws:") || spec.startsWith("wss:")) return wsSource(spec);
  throw new Error(`unknown source: ${spec}`);
}

async function writeSink(spec: string, iter: AsyncIterable<Chunk>): Promise<void> {
  if (spec === "stdio" || spec === "-" || !spec) return ndjsonStdoutSink()(iter);
  if (spec.startsWith("file:")) return fileSink(spec.slice(5), iter);
  if (spec.startsWith("ws:") || spec.startsWith("wss:")) return wsSink(spec, iter);
  throw new Error(`unknown sink: ${spec}`);
}

async function cmdPipe(args: Args): Promise<void> {
  const inSpec = (args.in as string) ?? "stdio";
  const outSpec = (args.out as string) ?? "stdio";
  const type = args.type as ChunkType | undefined;
  const src = resolveSource(inSpec, type);
  await writeSink(outSpec, src);
}

async function cmdBridge(args: Args): Promise<void> {
  const port = parseInt((args.port as string) ?? "7878", 10);
  const host = args.host as string | undefined;
  const path = args.path as string | undefined;
  const opts: { port: number; host?: string; path?: string } = { port };
  if (host !== undefined) opts.host = host;
  if (path !== undefined) opts.path = path;
  const server = await wsBridge(opts);
  process.stdout.write(`floosie bridge listening at ${server.url}\n`);

  if (process.stdin.isTTY === false) {
    void (async () => {
      for await (const chunk of stdinNdjsonSource()) server.broadcast(chunk);
    })();
  }
  for await (const chunk of server.source()) {
    process.stdout.write(JSON.stringify(chunk) + "\n");
  }
}

async function cmdMux(args: Args): Promise<void> {
  const urls = ((args.urls as string) ?? "").split(",").filter(Boolean);
  if (!urls.length) throw new Error("mux: --urls required");
  const strategy = ((args.strategy as string) ?? "round-robin") as LoadBalanceStrategy;
  const mux = await muxWsClients(urls);
  void (async () => {
    for await (const chunk of stdinNdjsonSource()) mux.send(chunk, strategy);
  })();
  for await (const chunk of mux.source()) {
    process.stdout.write(JSON.stringify(chunk) + "\n");
  }
}

async function cmdInspect(args: Args): Promise<void> {
  const path = args._[0];
  if (!path) throw new Error("inspect: file path required");
  const { readFile } = await import("node:fs/promises");
  const data = new Uint8Array(await readFile(path));
  const chunk = await autoDecodeAsync(data);
  process.stdout.write(JSON.stringify({
    type: chunk.type,
    bytes: data.length,
    meta: chunk.meta ?? null,
  }, null, 2) + "\n");
}

const COMMANDS: Record<string, (a: Args) => Promise<void>> = {
  pipe: cmdPipe,
  bridge: cmdBridge,
  mux: cmdMux,
  inspect: cmdInspect,
  help: async () => { process.stdout.write(HELP); },
};

export async function runCli(argv: string[]): Promise<void> {
  const args = mri(argv) as Args;
  const cmd = args._.shift() ?? "help";
  const fn = COMMANDS[cmd];
  if (!fn) { process.stderr.write(`unknown command: ${cmd}\n${HELP}`); process.exit(1); }
  try { await fn(args); } catch (e) {
    process.stderr.write(`error: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}

export { encodeChunk, decodeChunk };
