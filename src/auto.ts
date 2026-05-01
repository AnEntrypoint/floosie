import type { Chunk, ChunkType } from "./chunk.js";
import { decodeChunk } from "./codec.js";
import { detectMime, detectFile } from "./mime.js";

const MIME_TO_TYPE: Record<string, ChunkType> = {
  "application/json": "json",
  "application/x-ndjson": "ndjson",
  "text/csv": "csv",
  "application/xml": "xml", "text/xml": "xml",
  "text/html": "html",
  "text/markdown": "markdown",
  "text/plain": "text",
  "application/x-yaml": "yaml", "application/yaml": "yaml",
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

export function autoDecode(bytes: Uint8Array): Chunk {
  const mime = detectMime(bytes);
  const type = MIME_TO_TYPE[mime] ?? "binary";
  return decodeChunk(type, bytes, { mime });
}

export async function autoDecodeAsync(bytes: Uint8Array): Promise<Chunk> {
  const info = await detectFile(bytes);
  const type = MIME_TO_TYPE[info.mime] ?? "binary";
  return decodeChunk(type, bytes, { mime: info.mime, ext: info.ext });
}

export function mimeToChunkType(mime: string): ChunkType {
  return MIME_TO_TYPE[mime] ?? "binary";
}
