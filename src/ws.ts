import type { Chunk } from "./chunk-types.js";
import { encodeFrame, decodeFrame, toBytes, createAsyncQueue, type WSLike } from "./ws-frame.js";

export { encodeFrame as encodeWsFrame, decodeFrame as decodeWsFrame };
export type { WSLike };

function getCtor(WSImpl?: new (u: string) => WSLike): new (u: string) => WSLike {
  const Ctor = WSImpl ?? (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket;
  if (!Ctor) throw new Error("ws: no WebSocket implementation; pass one or run on Node 22+/browser");
  return Ctor;
}

async function openSocket(url: string, WSImpl?: new (u: string) => WSLike): Promise<WSLike> {
  const ws = new (getCtor(WSImpl))(url);
  ws.binaryType = "arraybuffer";
  await new Promise<void>((res, rej) => {
    ws.addEventListener("open", () => res());
    ws.addEventListener("error", rej);
  });
  return ws;
}

export async function* wsSource(url: string, WSImpl?: new (u: string) => WSLike): AsyncIterable<Chunk> {
  const ws = await openSocket(url, WSImpl);
  const q = createAsyncQueue<Chunk>();
  ws.addEventListener("message", (e) => {
    void toBytes(e.data).then(b => q.push(decodeFrame(b))).catch(err => q.finish(err));
  });
  ws.addEventListener("close", () => q.finish());
  ws.addEventListener("error", (e) => q.finish(e));
  try { yield* q.iter(); }
  finally { try { ws.close(); } catch { /* */ } }
}

export async function wsSink(url: string, iter: AsyncIterable<Chunk>, WSImpl?: new (u: string) => WSLike): Promise<void> {
  const ws = await openSocket(url, WSImpl);
  try { for await (const chunk of iter) ws.send(encodeFrame(chunk)); }
  finally { try { ws.close(); } catch { /* */ } }
}

export type WsBridgeServer = {
  readonly url: string;
  readonly clients: ReadonlySet<WSLike>;
  broadcast(chunk: Chunk): void;
  source(): AsyncIterable<Chunk>;
  close(): Promise<void>;
};

export type WsBridgeOptions = { port: number; host?: string; path?: string };

export async function wsBridge(opts: WsBridgeOptions): Promise<WsBridgeServer> {
  const { WebSocketServer } = await import("ws");
  const server = new WebSocketServer({ port: opts.port, host: opts.host, path: opts.path });
  const clients = new Set<WSLike>();
  const q = createAsyncQueue<Chunk>();

  server.on("connection", (raw) => {
    const ws = raw as unknown as WSLike & { on: (ev: string, l: (...a: unknown[]) => void) => void };
    clients.add(ws);
    ws.on("message", (data: unknown) => {
      void toBytes(data).then(b => q.push(decodeFrame(b)));
    });
    ws.on("close", () => clients.delete(ws));
  });

  return {
    url: `ws://${opts.host ?? "localhost"}:${opts.port}${opts.path ?? ""}`,
    clients,
    broadcast(chunk) {
      const frame = encodeFrame(chunk);
      for (const c of clients) { try { c.send(frame); } catch { /* */ } }
    },
    source() { return q.iter(); },
    async close() {
      q.finish();
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
  const sockets = await Promise.all(urls.map(u => openSocket(u, WSImpl)));
  const q = createAsyncQueue<Chunk>();
  for (const s of sockets) {
    s.addEventListener("message", (e) => {
      void toBytes(e.data).then(b => q.push(decodeFrame(b)));
    });
  }
  let rr = 0;
  return {
    send(chunk, strategy = "round-robin", key) {
      const frame = encodeFrame(chunk);
      if (strategy === "broadcast") { for (const s of sockets) s.send(frame); return; }
      if (strategy === "hash") {
        const h = (key ?? chunk.type).split("").reduce((a: number, c: string) => (a * 31 + c.charCodeAt(0)) | 0, 0);
        sockets[Math.abs(h) % sockets.length]?.send(frame);
        return;
      }
      sockets[rr % sockets.length]?.send(frame);
      rr++;
    },
    source() { return q.iter(); },
    close() {
      for (const s of sockets) try { s.close(); } catch { /* */ }
      q.finish();
    },
  };
}
