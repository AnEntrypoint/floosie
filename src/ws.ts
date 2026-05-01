import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk, encodeChunk } from "./codec.js";

type WSLike = {
  send(data: string | Uint8Array): void;
  close(): void;
  addEventListener(type: "message", l: (e: { data: unknown }) => void): void;
  addEventListener(type: "open" | "close" | "error", l: (e: unknown) => void): void;
  removeEventListener(type: string, l: (e: unknown) => void): void;
  readyState: number;
  binaryType?: string;
};

const FRAME_HEADER_BYTES = 1;

function encodeFrame(chunk: Chunk): Uint8Array {
  const typeBytes = new TextEncoder().encode(chunk.type);
  const payload = encodeChunk(chunk);
  const meta = chunk.meta ? new TextEncoder().encode(JSON.stringify(chunk.meta)) : new Uint8Array(0);
  const out = new Uint8Array(1 + typeBytes.length + 4 + meta.length + payload.length);
  let o = 0;
  out[o++] = typeBytes.length;
  out.set(typeBytes, o); o += typeBytes.length;
  const dv = new DataView(out.buffer, out.byteOffset);
  dv.setUint32(o, meta.length); o += 4;
  out.set(meta, o); o += meta.length;
  out.set(payload, o);
  return out;
}

function decodeFrame(buf: Uint8Array): Chunk {
  const tlen = buf[0] ?? 0;
  const type = new TextDecoder().decode(buf.subarray(1, 1 + tlen)) as ChunkType;
  const dv = new DataView(buf.buffer, buf.byteOffset + 1 + tlen, 4);
  const mlen = dv.getUint32(0);
  const metaStart = 1 + tlen + 4;
  const meta = mlen > 0 ? JSON.parse(new TextDecoder().decode(buf.subarray(metaStart, metaStart + mlen))) : undefined;
  const payload = buf.subarray(metaStart + mlen);
  return decodeChunk(type, payload, meta);
}

async function toBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof Blob !== "undefined" && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  if (typeof data === "string") return new TextEncoder().encode(data);
  if (data && typeof (data as { byteLength?: number }).byteLength === "number") {
    return new Uint8Array((data as { buffer: ArrayBuffer }).buffer);
  }
  throw new Error("ws: unsupported message data type");
}

export async function* wsSource(url: string, WSImpl?: new (u: string) => WSLike): AsyncIterable<Chunk> {
  const Ctor = (WSImpl ?? (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket);
  if (!Ctor) throw new Error("ws: no WebSocket implementation; pass one or run on Node 22+/browser");
  const ws = new Ctor(url) as WSLike;
  ws.binaryType = "arraybuffer";
  const queue: Chunk[] = [];
  const waiters: Array<(v: IteratorResult<Chunk>) => void> = [];
  let closed = false;
  let error: unknown = null;

  const push = (c: Chunk) => {
    const w = waiters.shift();
    if (w) w({ value: c, done: false }); else queue.push(c);
  };
  const finish = () => {
    closed = true;
    for (const w of waiters.splice(0)) w({ value: undefined as unknown as Chunk, done: true });
  };

  ws.addEventListener("message", (e) => {
    void toBytes(e.data).then(b => push(decodeFrame(b))).catch(err => { error = err; finish(); });
  });
  ws.addEventListener("close", finish);
  ws.addEventListener("error", (e) => { error = e; finish(); });
  await new Promise<void>((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", rej);
  });

  try {
    while (!closed || queue.length) {
      if (queue.length) { yield queue.shift()!; continue; }
      const next = await new Promise<IteratorResult<Chunk>>(r => waiters.push(r));
      if (next.done) break;
      yield next.value;
    }
    if (error) throw error;
  } finally {
    try { ws.close(); } catch { /* */ }
  }
}

export async function wsSink(url: string, iter: AsyncIterable<Chunk>, WSImpl?: new (u: string) => WSLike): Promise<void> {
  const Ctor = (WSImpl ?? (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket);
  if (!Ctor) throw new Error("ws: no WebSocket implementation");
  const ws = new Ctor(url) as WSLike;
  ws.binaryType = "arraybuffer";
  await new Promise<void>((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", rej);
  });
  try {
    for await (const chunk of iter) ws.send(encodeFrame(chunk));
  } finally {
    try { ws.close(); } catch { /* */ }
  }
}

export type WsBridgeServer = {
  readonly url: string;
  readonly clients: ReadonlySet<WSLike>;
  broadcast(chunk: Chunk): void;
  source(): AsyncIterable<Chunk>;
  close(): Promise<void>;
};

export type WsBridgeOptions = {
  port: number;
  host?: string;
  path?: string;
};

export async function wsBridge(opts: WsBridgeOptions): Promise<WsBridgeServer> {
  const { WebSocketServer } = await import("ws");
  const server = new WebSocketServer({ port: opts.port, host: opts.host, path: opts.path });
  const clients = new Set<WSLike>();
  const inbox: Chunk[] = [];
  const waiters: Array<(v: IteratorResult<Chunk>) => void> = [];
  let closed = false;

  server.on("connection", (raw) => {
    const ws = raw as unknown as WSLike & { on: (ev: string, l: (...a: unknown[]) => void) => void };
    clients.add(ws);
    ws.on("message", (data: unknown) => {
      void toBytes(data).then(b => {
        const c = decodeFrame(b);
        const w = waiters.shift();
        if (w) w({ value: c, done: false }); else inbox.push(c);
      });
    });
    ws.on("close", () => clients.delete(ws));
  });

  const broadcast = (chunk: Chunk) => {
    const frame = encodeFrame(chunk);
    for (const c of clients) { try { c.send(frame); } catch { /* */ } }
  };

  async function* source(): AsyncIterable<Chunk> {
    while (!closed || inbox.length) {
      if (inbox.length) { yield inbox.shift()!; continue; }
      const next = await new Promise<IteratorResult<Chunk>>(r => waiters.push(r));
      if (next.done) break;
      yield next.value;
    }
  }

  return {
    url: `ws://${opts.host ?? "localhost"}:${opts.port}${opts.path ?? ""}`,
    clients,
    broadcast,
    source,
    async close(): Promise<void> {
      closed = true;
      for (const w of waiters.splice(0)) w({ value: undefined as unknown as Chunk, done: true });
      await new Promise<void>((res, rej) => server.close(e => e ? rej(e) : res()));
    },
  };
}

export type LoadBalanceStrategy = "round-robin" | "broadcast" | "hash";

export async function muxWsClients(urls: string[], WSImpl?: new (u: string) => WSLike): Promise<{
  send(chunk: Chunk, strategy?: LoadBalanceStrategy, key?: string): void;
  source(): AsyncIterable<Chunk>;
  close(): void;
}> {
  const Ctor = (WSImpl ?? (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket);
  if (!Ctor) throw new Error("ws: no WebSocket implementation");
  const sockets = urls.map(u => new Ctor(u) as WSLike);
  for (const s of sockets) s.binaryType = "arraybuffer";
  await Promise.all(sockets.map(s => new Promise<void>((res, rej) => {
    s.addEventListener("open", () => res());
    s.addEventListener("error", rej);
  })));

  const inbox: Chunk[] = [];
  const waiters: Array<(v: IteratorResult<Chunk>) => void> = [];
  let closed = false;
  for (const s of sockets) {
    s.addEventListener("message", (e) => {
      void toBytes(e.data).then(b => {
        const c = decodeFrame(b);
        const w = waiters.shift();
        if (w) w({ value: c, done: false }); else inbox.push(c);
      });
    });
  }

  let rr = 0;
  const send = (chunk: Chunk, strategy: LoadBalanceStrategy = "round-robin", key?: string) => {
    const frame = encodeFrame(chunk);
    if (strategy === "broadcast") {
      for (const s of sockets) s.send(frame);
      return;
    }
    if (strategy === "hash") {
      const h = (key ?? chunk.type).split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
      sockets[Math.abs(h) % sockets.length]?.send(frame);
      return;
    }
    sockets[rr % sockets.length]?.send(frame);
    rr++;
  };

  async function* source(): AsyncIterable<Chunk> {
    while (!closed || inbox.length) {
      if (inbox.length) { yield inbox.shift()!; continue; }
      const next = await new Promise<IteratorResult<Chunk>>(r => waiters.push(r));
      if (next.done) break;
      yield next.value;
    }
  }

  return {
    send,
    source,
    close(): void {
      closed = true;
      for (const s of sockets) try { s.close(); } catch { /* */ }
      for (const w of waiters.splice(0)) w({ value: undefined as unknown as Chunk, done: true });
    },
  };
}

export { encodeFrame as encodeWsFrame, decodeFrame as decodeWsFrame };
