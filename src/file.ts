import { createReadStream, createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk, encodeChunk } from "./codec.js";
import { detectFile } from "./mime.js";

const MIME_TO_TYPE: Record<string, ChunkType> = {
  "application/json": "json",
  "application/x-ndjson": "ndjson",
  "text/csv": "csv",
  "application/xml": "xml",
  "text/xml": "xml",
  "text/html": "html",
  "text/markdown": "markdown",
  "text/plain": "text",
  "application/x-yaml": "yaml",
  "application/yaml": "yaml",
  "application/sql": "sql",
  "image/jpeg": "image", "image/png": "image", "image/gif": "image",
  "image/webp": "image", "image/bmp": "image", "image/tiff": "image",
  "image/avif": "image", "image/x-icon": "image",
  "video/mp4": "video", "video/webm": "video", "video/mpeg": "video",
  "audio/mpeg": "audio", "audio/ogg": "audio", "audio/flac": "audio",
  "application/pdf": "pdf",
  "application/zip": "archive", "application/gzip": "archive",
  "application/x-bzip2": "archive", "application/x-xz": "archive",
  "application/x-7z-compressed": "archive", "application/x-rar-compressed": "archive",
  "application/wasm": "wasm",
  "application/vnd.apache.arrow.file": "arrow",
  "application/vnd.apache.parquet": "parquet",
};

export async function* fileSource(path: string, type?: ChunkType): AsyncIterable<Chunk> {
  if (type) {
    const data = await readFile(path);
    yield decodeChunk(type, new Uint8Array(data));
    return;
  }
  const sniff = await readFile(path);
  const info = await detectFile(new Uint8Array(sniff.subarray(0, Math.min(4096, sniff.length))));
  const mapped = MIME_TO_TYPE[info.mime] ?? "binary";
  yield decodeChunk(mapped, new Uint8Array(sniff), { mime: info.mime, path });
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
