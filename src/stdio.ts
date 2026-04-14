import { sflow } from "sflow";
import type { Chunk, ChunkType } from "./chunk.js";
import { encodeChunk, decodeChunk } from "./codec.js";
import { createProcessor, type ProcessorConfig, type ProcessorHandle } from "./processor.js";

type Framing = "ndjson" | "length-prefix" | "newline";

const FRAME_TYPES: Record<ChunkType, Framing> = {
  json: "ndjson",       raw: "ndjson",      error: "ndjson",    signal: "ndjson",
  token: "ndjson",      "http-request": "length-prefix",        "http-response": "length-prefix",
  websocket: "length-prefix",
  text: "newline",      ndjson: "newline",  sql: "newline",     delta: "newline",
  uuid: "newline",      sse: "newline",
  binary: "length-prefix",  image: "length-prefix",  video: "length-prefix",
  audio: "length-prefix",   pdf: "length-prefix",    archive: "length-prefix",
  embedding: "length-prefix",
  xml: "length-prefix",     yaml: "length-prefix",   markdown: "length-prefix",
  html: "length-prefix",    csv: "newline",
  uint8: "length-prefix",   int32: "length-prefix",  float64: "length-prefix",
  bool: "length-prefix",    timestamp: "length-prefix",
  null: "length-prefix",
  protobuf: "length-prefix",  msgpack: "length-prefix",  cbor: "length-prefix",
  arrow: "length-prefix",     parquet: "length-prefix",
  geojson: "length-prefix",   jwt: "newline",             graphql: "length-prefix",
  rpc: "ndjson",              event: "ndjson",             span: "ndjson",
  metric: "ndjson",           log: "ndjson",               command: "ndjson",
  frame: "length-prefix",     patch: "ndjson",             multipart: "length-prefix",
  wasm: "length-prefix",      font: "length-prefix",       onnx: "length-prefix",
  safetensors: "length-prefix", epub: "length-prefix",     docx: "length-prefix",
  xlsx: "length-prefix",      pptx: "length-prefix",       gltf: "length-prefix",
  qrcode: "length-prefix",
  toml: "length-prefix",      ini: "newline",              jsonschema: "length-prefix",
  avroschema: "length-prefix", sourcemap: "length-prefix", shader: "length-prefix",
  obj: "length-prefix",       subtitle: "newline",         playlist: "newline",
  graphml: "length-prefix",
  socketio: "ndjson",         webtransport: "length-prefix", envelope: "ndjson",
  ack: "ndjson",              nack: "ndjson",              ast: "ndjson",
  hash: "ndjson",             signature: "length-prefix",  tensor: "length-prefix",
  timeseries: "ndjson",       ohlcv: "ndjson",             adjacency: "ndjson",
  pointcloud: "length-prefix", keypair: "length-prefix",  certificate: "length-prefix",
  hmac: "length-prefix",      dns: "length-prefix",        dhcp: "length-prefix",
  icmp: "length-prefix",      ciphertext: "length-prefix",
  int8: "length-prefix",      int16: "length-prefix",      uint16: "length-prefix",
  uint32: "length-prefix",    int64: "length-prefix",      uint64: "length-prefix",
  float32: "length-prefix",   complex64: "length-prefix",  complex128: "length-prefix",
};

const STDERR_TYPES = new Set<ChunkType>(["error", "signal"]);

async function* stdinChunks(type: ChunkType): AsyncIterable<Chunk> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const strategy = FRAME_TYPES[type];

  if (strategy === "ndjson" || strategy === "newline") {
    let buf = "";
    for await (const raw of process.stdin) {
      buf += dec.decode(raw as Uint8Array, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        yield decodeChunk(type, enc.encode(line));
      }
    }
    if (buf.trim()) yield decodeChunk(type, enc.encode(buf));
    return;
  }

  let pending = Buffer.alloc(0);
  for await (const raw of process.stdin) {
    pending = Buffer.concat([pending, Buffer.from(raw as Uint8Array)]);
    while (pending.length >= 4) {
      const len = pending.readUInt32BE(0);
      if (pending.length < 4 + len) break;
      const payload = pending.subarray(4, 4 + len);
      pending = pending.subarray(4 + len);
      yield decodeChunk(type, payload);
    }
  }
}

function writeChunk(chunk: Chunk): void {
  const dest = STDERR_TYPES.has(chunk.type) ? process.stderr : process.stdout;
  const strategy = FRAME_TYPES[chunk.type];
  const bytes = encodeChunk(chunk);

  if (strategy === "ndjson" || strategy === "newline") {
    dest.write(new TextDecoder().decode(bytes) + "\n");
    return;
  }

  const frame = Buffer.alloc(4 + bytes.length);
  frame.writeUInt32BE(bytes.length, 0);
  bytes.forEach((b, i) => frame.writeUInt8(b, 4 + i));
  dest.write(frame);
}

export function stdioProcessor<I extends Chunk, O extends Chunk>(
  config: Omit<ProcessorConfig<I, O>, "input" | "output"> & { inputType: ChunkType },
): ProcessorHandle<I, O> {
  const input = stdinChunks(config.inputType) as AsyncIterable<Chunk>;
  return createProcessor<I, O>({
    name: config.name,
    input,
    transform: (flow) => {
      const transformed = config.transform(flow);
      return sflow(transformed).forEach((chunk: O) => { writeChunk(chunk); }) as ReturnType<typeof sflow<O>>;
    },
  });
}
