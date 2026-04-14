import type { Chunk, SseMessage } from "./chunk-types.js";
import type { ChunkCodec } from "./codec-types.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

const jsonCodec = <K extends
  "http-request" | "http-response" | "websocket" | "token" | "error" | "signal" |
  "rpc" | "event" | "span" | "metric" | "log" | "command" | "patch" |
  "socketio" | "webtransport" | "envelope" | "ack" | "nack" | "ast" |
  "hash" | "signature" | "tensor" | "timeseries" | "ohlcv" | "adjacency" |
  "pointcloud" | "keypair" | "certificate" | "hmac" | "ciphertext" |
  "timeseries" | "ohlcv"
>(type: K): ChunkCodec<Extract<Chunk, { type: K }>> => {
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => enc.encode(JSON.stringify((c as { data: unknown }).data)),
    decode: (b, meta) => {
      const data: unknown = JSON.parse(dec.decode(b));
      return (meta !== undefined ? { type, data, meta } : { type, data }) as T;
    },
  };
};

export const SSE_CODEC: ChunkCodec<Extract<Chunk, { type: "sse" }>> = {
  encode: (c) => {
    const parts: string[] = [];
    if (c.data.event !== undefined) parts.push(`event: ${c.data.event}`);
    if (c.data.id !== undefined) parts.push(`id: ${c.data.id}`);
    parts.push(`data: ${c.data.data}`);
    return enc.encode(parts.join("\n") + "\n\n");
  },
  decode: (b, meta) => {
    const data: Partial<SseMessage> = {};
    for (const line of dec.decode(b).split("\n")) {
      if (line.startsWith("data: ")) data.data = line.slice(6);
      else if (line.startsWith("event: ")) data.event = line.slice(7);
      else if (line.startsWith("id: ")) data.id = line.slice(4);
    }
    if (data.data === undefined) throw new Error(`sse decode: missing data field in: ${dec.decode(b).slice(0, 80)}`);
    const msg: SseMessage = { data: data.data };
    if (data.event !== undefined) msg.event = data.event;
    if (data.id !== undefined) msg.id = data.id;
    return meta !== undefined ? { type: "sse", data: msg, meta } : { type: "sse", data: msg };
  },
};

export const STRUCTURED_CODECS = {
  "http-request":  jsonCodec("http-request"),
  "http-response": jsonCodec("http-response"),
  "websocket":     jsonCodec("websocket"),
  "token":         jsonCodec("token"),
  "error":         jsonCodec("error"),
  "signal":        jsonCodec("signal"),
  "rpc":           jsonCodec("rpc"),
  "event":         jsonCodec("event"),
  "span":          jsonCodec("span"),
  "metric":        jsonCodec("metric"),
  "log":           jsonCodec("log"),
  "command":       jsonCodec("command"),
  "patch":         jsonCodec("patch"),
  "socketio":      jsonCodec("socketio"),
  "envelope":      jsonCodec("envelope"),
  "ack":           jsonCodec("ack"),
  "nack":          jsonCodec("nack"),
  "ast":           jsonCodec("ast"),
  "hash":          jsonCodec("hash"),
  "timeseries":    jsonCodec("timeseries"),
  "ohlcv":         jsonCodec("ohlcv"),
  "adjacency":     jsonCodec("adjacency"),
  "sse":           SSE_CODEC,
};
