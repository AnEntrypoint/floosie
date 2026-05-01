import { fileTypeFromBuffer } from "file-type";
import type { ChunkType } from "./chunk-types.js";

export type FileInfo = {
  mime: string;
  ext?: string;
  charset?: string;
  description?: string;
};

const SYNC_SIGS: Array<[number[], string]> = [
  [[0xff, 0xfe], "text/plain"],
  [[0xfe, 0xff], "text/plain"],
  [[0xef, 0xbb, 0xbf], "text/plain"],
  [[0x1f, 0x8b], "application/gzip"],
  [[0x50, 0x4b, 0x03, 0x04], "application/zip"],
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
  [[0x25, 0x50, 0x44, 0x46], "application/pdf"],
];

export function detectMime(data: Uint8Array): string {
  for (const [sig, mime] of SYNC_SIGS) {
    if (sig.every((b, i) => data[i] === b)) return mime;
  }
  if (data.length === 0) return "application/octet-stream";
  const sample = data.subarray(0, Math.min(64, data.length));
  let high = 0;
  for (let i = 0; i < sample.length; i++) if (sample[i]! > 127) high++;
  if (high / sample.length > 0.3) return "application/octet-stream";
  const head = new TextDecoder("utf-8", { fatal: false }).decode(sample).trimStart();
  if (head.startsWith("{") || head.startsWith("[")) return "application/json";
  if (/^<\?xml/i.test(head)) return "application/xml";
  if (/^<!DOCTYPE\s+html|^<html/i.test(head)) return "text/html";
  return "text/plain";
}

export async function detectFile(data: Uint8Array): Promise<FileInfo> {
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) {
    return { mime: "text/plain", ext: "txt", charset: "utf-16le", description: "utf-16le text" };
  }
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) {
    return { mime: "text/plain", ext: "txt", charset: "utf-16be", description: "utf-16be text" };
  }
  const r = await fileTypeFromBuffer(data);
  if (r) return { mime: r.mime, ext: r.ext };
  const mime = detectMime(data);
  return mime === "application/octet-stream" ? { mime } : { mime, ext: "txt" };
}

export const MIME_TO_TYPE: Record<string, ChunkType> = {
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

export function mimeToChunkType(mime: string): ChunkType {
  return MIME_TO_TYPE[mime] ?? "binary";
}
