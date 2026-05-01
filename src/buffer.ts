import { createHash, createHmac, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync, deflateSync, inflateSync, brotliCompressSync, brotliDecompressSync } from "node:zlib";
import type { Chunk } from "./chunk-types.js";
import { createNode, type StreamNode } from "./node.js";

const HEX = "0123456789abcdef";

export function toHex(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) { const v = b[i]!; s += HEX[v >> 4]! + HEX[v & 0xf]!; }
  return s;
}

export function fromHex(s: string): Uint8Array {
  const t = s.replace(/[^0-9a-fA-F]/g, "");
  if (t.length % 2) throw new Error("hex: odd length");
  const out = new Uint8Array(t.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(t.substr(i << 1, 2), 16);
  return out;
}

export function toBase64(b: Uint8Array): string {
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("base64");
}

export function fromBase64(s: string): Uint8Array {
  const buf = Buffer.from(s, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

export function toBase64Url(b: Uint8Array): string {
  return Buffer.from(b.buffer, b.byteOffset, b.byteLength).toString("base64url");
}

export function fromBase64Url(s: string): Uint8Array {
  const buf = Buffer.from(s, "base64url");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function toBase32(b: Uint8Array): string {
  let bits = 0, val = 0, out = "";
  for (let i = 0; i < b.length; i++) {
    val = (val << 8) | b[i]!; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 0x1f]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 0x1f];
  while (out.length % 8) out += "=";
  return out;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function slice(b: Uint8Array, start: number, end?: number): Uint8Array {
  return b.subarray(start, end);
}

export function indexOf(haystack: Uint8Array, needle: Uint8Array, from = 0): number {
  if (!needle.length) return from;
  outer: for (let i = from; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export function splitBytes(b: Uint8Array, sep: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let start = 0;
  while (true) {
    const i = indexOf(b, sep, start);
    if (i < 0) break;
    out.push(b.subarray(start, i));
    start = i + sep.length;
  }
  out.push(b.subarray(start));
  return out;
}

export function equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function hexdump(b: Uint8Array, opts?: { offset?: number; width?: number; max?: number }): string {
  const width = opts?.width ?? 16;
  const max = opts?.max ?? b.length;
  const off0 = opts?.offset ?? 0;
  const len = Math.min(max, b.length);
  const lines: string[] = [];
  for (let i = 0; i < len; i += width) {
    const row = b.subarray(i, Math.min(i + width, len));
    const hex = Array.from(row, v => HEX[v >> 4]! + HEX[v & 0xf]!).join(" ").padEnd(width * 3 - 1, " ");
    let ascii = "";
    for (let j = 0; j < row.length; j++) { const v = row[j]!; ascii += v >= 0x20 && v < 0x7f ? String.fromCharCode(v) : "."; }
    lines.push(`${(off0 + i).toString(16).padStart(8, "0")}  ${hex}  |${ascii}|`);
  }
  if (len < b.length) lines.push(`... (${b.length - len} more bytes)`);
  return lines.join("\n");
}

export function digest(b: Uint8Array, algo: "sha256" | "sha1" | "sha512" | "md5" = "sha256"): Uint8Array {
  return new Uint8Array(createHash(algo).update(b).digest());
}

export function hmacDigest(key: Uint8Array | string, b: Uint8Array, algo: "sha256" | "sha1" | "sha512" = "sha256"): Uint8Array {
  return new Uint8Array(createHmac(algo, key).update(b).digest());
}

export function rand(n: number): Uint8Array {
  return new Uint8Array(randomBytes(n));
}

export function gzip(b: Uint8Array): Uint8Array { return new Uint8Array(gzipSync(b)); }
export function gunzip(b: Uint8Array): Uint8Array { return new Uint8Array(gunzipSync(b)); }
export function deflate(b: Uint8Array): Uint8Array { return new Uint8Array(deflateSync(b)); }
export function inflate(b: Uint8Array): Uint8Array { return new Uint8Array(inflateSync(b)); }
export function brotli(b: Uint8Array): Uint8Array { return new Uint8Array(brotliCompressSync(b)); }
export function unbrotli(b: Uint8Array): Uint8Array { return new Uint8Array(brotliDecompressSync(b)); }

const COMPRESSORS = { gzip, deflate, brotli } as const;
const DECOMPRESSORS = { gzip: gunzip, deflate: inflate, brotli: unbrotli } as const;

export function compress(b: Uint8Array, algo: keyof typeof COMPRESSORS = "gzip"): Uint8Array {
  return COMPRESSORS[algo](b);
}

export function decompress(b: Uint8Array, algo: keyof typeof DECOMPRESSORS = "gzip"): Uint8Array {
  return DECOMPRESSORS[algo](b);
}

type ByteCarrier = Extract<Chunk, { data: Uint8Array }>;

export function rechunk<T extends ByteCarrier>(size: number): StreamNode<T, T> {
  return createNode("rechunk", (flow) =>
    flow.through(async function*(src) {
      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      let template: T | null = null;
      for await (const v of src) {
        template = v;
        buf = concat(buf, v.data as Uint8Array) as Uint8Array<ArrayBuffer>;
        while (buf.length >= size) {
          const out = buf.subarray(0, size);
          buf = buf.subarray(size);
          yield { ...v, data: new Uint8Array(out) } as T;
        }
      }
      if (buf.length && template) yield { ...template, data: new Uint8Array(buf) } as T;
    })
  );
}

export function splitOn<T extends ByteCarrier>(sep: Uint8Array): StreamNode<T, T> {
  return createNode("splitOn", (flow) =>
    flow.through(async function*(src) {
      let buf: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      let template: T | null = null;
      for await (const v of src) {
        template = v;
        buf = concat(buf, v.data as Uint8Array) as Uint8Array<ArrayBuffer>;
        let i: number;
        while ((i = indexOf(buf, sep)) >= 0) {
          yield { ...v, data: new Uint8Array(buf.subarray(0, i)) } as T;
          buf = buf.subarray(i + sep.length);
        }
      }
      if (buf.length && template) yield { ...template, data: new Uint8Array(buf) } as T;
    })
  );
}

export function tap<T extends Chunk>(fn: (v: T) => void): StreamNode<T, T> {
  return createNode("tap", (flow) =>
    flow.through(async function*(src) {
      for await (const v of src) { fn(v); yield v; }
    })
  );
}

export function mapBytes<T extends ByteCarrier>(fn: (b: Uint8Array) => Uint8Array): StreamNode<T, T> {
  return createNode("mapBytes", (flow) =>
    flow.through(async function*(src) {
      for await (const v of src) yield { ...v, data: fn(v.data) } as T;
    })
  );
}
