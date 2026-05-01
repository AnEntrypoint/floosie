import { createReadStream, createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk, encodeChunk } from "./codec.js";
import { detectFile, mimeToChunkType } from "./mime.js";

export async function* fileSource(path: string, type?: ChunkType): AsyncIterable<Chunk> {
  const data = await readFile(path);
  const bytes = new Uint8Array(data);
  if (type) { yield decodeChunk(type, bytes); return; }
  const info = await detectFile(bytes.subarray(0, Math.min(4096, bytes.length)));
  const meta: Record<string, unknown> = { mime: info.mime, path };
  yield decodeChunk(mimeToChunkType(info.mime), bytes, meta);
}

export async function* fileLineSource(path: string): AsyncIterable<Chunk> {
  const stream = createReadStream(path, { encoding: "utf8" });
  let buf = "";
  for await (const part of stream as AsyncIterable<string>) {
    buf += part;
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) if (line) yield decodeChunk("text", new TextEncoder().encode(line));
  }
  if (buf) yield decodeChunk("text", new TextEncoder().encode(buf));
}

export async function fileSink(path: string, iter: AsyncIterable<Chunk>, separator = "\n"): Promise<void> {
  const ws = createWriteStream(path);
  const sep = new TextEncoder().encode(separator);
  try {
    for await (const chunk of iter) {
      const bytes = encodeChunk(chunk);
      await new Promise<void>((res, rej) => ws.write(bytes, e => e ? rej(e) : res()));
      if (separator) await new Promise<void>((res, rej) => ws.write(sep, e => e ? rej(e) : res()));
    }
  } finally {
    await new Promise<void>(res => ws.end(res));
  }
}
