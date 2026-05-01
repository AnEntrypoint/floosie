import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk, encodeChunk } from "./codec.js";

export type WSLike = {
  send(data: string | Uint8Array): void;
  close(): void;
  addEventListener(type: "message", l: (e: { data: unknown }) => void): void;
  addEventListener(type: "open" | "close" | "error", l: (e: unknown) => void): void;
  removeEventListener(type: string, l: (e: unknown) => void): void;
  readyState: number;
  binaryType?: string;
};

export function encodeFrame(chunk: Chunk): Uint8Array {
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

export function decodeFrame(buf: Uint8Array): Chunk {
  const tlen = buf[0] ?? 0;
  const type = new TextDecoder().decode(buf.subarray(1, 1 + tlen)) as ChunkType;
  const dv = new DataView(buf.buffer, buf.byteOffset + 1 + tlen, 4);
  const mlen = dv.getUint32(0);
  const metaStart = 1 + tlen + 4;
  const meta = mlen > 0 ? JSON.parse(new TextDecoder().decode(buf.subarray(metaStart, metaStart + mlen))) : undefined;
  const payload = buf.subarray(metaStart + mlen);
  return decodeChunk(type, payload, meta);
}

export async function toBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (typeof Blob !== "undefined" && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  if (typeof data === "string") return new TextEncoder().encode(data);
  if (data && typeof (data as { byteLength?: number }).byteLength === "number") {
    return new Uint8Array((data as { buffer: ArrayBuffer }).buffer);
  }
  throw new Error("ws: unsupported message data type");
}

export type AsyncQueue<T> = {
  push(v: T): void;
  finish(err?: unknown): void;
  iter(): AsyncIterable<T>;
};

export function createAsyncQueue<T>(): AsyncQueue<T> {
  const queue: T[] = [];
  const waiters: Array<(v: IteratorResult<T>) => void> = [];
  let closed = false;
  let error: unknown = null;
  return {
    push(v) {
      const w = waiters.shift();
      if (w) w({ value: v, done: false }); else queue.push(v);
    },
    finish(err) {
      if (err !== undefined) error = err;
      closed = true;
      for (const w of waiters.splice(0)) w({ value: undefined as unknown as T, done: true });
    },
    async *iter() {
      while (!closed || queue.length) {
        if (queue.length) { yield queue.shift()!; continue; }
        const next = await new Promise<IteratorResult<T>>(r => waiters.push(r));
        if (next.done) break;
        yield next.value;
      }
      if (error) throw error;
    },
  };
}
