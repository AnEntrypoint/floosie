import type { Chunk } from "./chunk-types.js";
import { decodeChunk } from "./codec.js";
import { detectMime, detectFile, mimeToChunkType } from "./mime.js";

export { mimeToChunkType };

export function autoDecode(bytes: Uint8Array): Chunk {
  const mime = detectMime(bytes);
  return decodeChunk(mimeToChunkType(mime), bytes, { mime });
}

export async function autoDecodeAsync(bytes: Uint8Array): Promise<Chunk> {
  const info = await detectFile(bytes);
  const meta: Record<string, unknown> = { mime: info.mime };
  if (info.ext !== undefined) meta.ext = info.ext;
  return decodeChunk(mimeToChunkType(info.mime), bytes, meta);
}
