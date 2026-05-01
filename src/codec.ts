import type { Chunk, ChunkType } from "./chunk-types.js";
import { TEXT_CODECS } from "./codec-text.js";
import { BINARY_CODECS } from "./codec-binary.js";
import { STRUCTURED_CODECS } from "./codec-structured.js";

export type ChunkCodec<T extends Chunk = Chunk> = {
  encode(chunk: T): Uint8Array;
  decode(bytes: Uint8Array, meta?: Record<string, unknown>): T;
};

export const CODECS: { [K in ChunkType]: ChunkCodec<Extract<Chunk, { type: K }>> } = {
  ...TEXT_CODECS,
  ...BINARY_CODECS,
  ...STRUCTURED_CODECS,
} as { [K in ChunkType]: ChunkCodec<Extract<Chunk, { type: K }>> };

export function encodeChunk(chunk: Chunk): Uint8Array {
  return (CODECS[chunk.type] as ChunkCodec<typeof chunk>).encode(chunk as never);
}

export function decodeChunk(type: ChunkType, bytes: Uint8Array, meta?: Record<string, unknown>): Chunk {
  return (CODECS[type] as ChunkCodec).decode(bytes, meta);
}
