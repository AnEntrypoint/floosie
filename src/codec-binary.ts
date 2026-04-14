import type { Chunk, FrameData, MultipartData, CiphertextData, SignatureData, HmacData, KeypairData, CertificateData, TensorData, PointcloudData, WebTransportData } from "./chunk-types.js";
import type { ChunkCodec } from "./codec-types.js";
import { detectMime } from "./mime.js";

const pass = <K extends
  "binary" | "image" | "video" | "audio" | "pdf" | "archive" |
  "protobuf" | "msgpack" | "cbor" | "arrow" | "parquet" |
  "wasm" | "font" | "onnx" | "safetensors" | "epub" | "docx" | "xlsx" | "pptx" | "gltf" | "qrcode" |
  "dns" | "dhcp" | "icmp"
>(type: K): ChunkCodec<Extract<Chunk, { type: K }>> => {
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => (c as { data: Uint8Array }).data,
    decode: (b, meta) => {
      const mime = detectMime(b);
      const m = meta !== undefined ? { ...meta, mime } : { mime };
      return { type, data: b, meta: m } as T;
    },
  };
};

const view = new DataView(new ArrayBuffer(8));
const fixedNum = <K extends "uint8"|"int8"|"int16"|"uint16"|"int32"|"uint32"|"float32"|"float64"|"bool"|"timestamp">(
  type: K, write: (v: number|boolean) => Uint8Array, read: (b: Uint8Array) => number|boolean,
): ChunkCodec<Extract<Chunk, { type: K }>> => {
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => write((c as { data: number|boolean }).data),
    decode: (b, meta) => {
      const data = read(b) as (number & boolean);
      return (meta !== undefined ? { type, data, meta } : { type, data }) as T;
    },
  };
};

const fixedBig = <K extends "int64"|"uint64">(
  type: K, write: (v: bigint) => Uint8Array, read: (b: Uint8Array) => bigint,
): ChunkCodec<Extract<Chunk, { type: K }>> => {
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => write((c as { data: bigint }).data),
    decode: (b, meta) => {
      const data = read(b);
      return (meta !== undefined ? { type, data, meta } : { type, data }) as T;
    },
  };
};

const u8w = (v: number|boolean) => new Uint8Array([Number(v) & 0xff]);
const u8r = (b: Uint8Array) => b[0]!;
const i8w = (v: number|boolean) => { view.setInt8(0, Number(v)); return new Uint8Array(view.buffer.slice(0, 1)); };
const i8r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getInt8(0);
const i16w = (v: number|boolean) => { view.setInt16(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 2)); };
const i16r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getInt16(0, true);
const u16w = (v: number|boolean) => { view.setUint16(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 2)); };
const u16r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getUint16(0, true);
const i32w = (v: number|boolean) => { view.setInt32(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 4)); };
const i32r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getInt32(0, true);
const u32w = (v: number|boolean) => { view.setUint32(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 4)); };
const u32r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getUint32(0, true);
const f32w = (v: number|boolean) => { view.setFloat32(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 4)); };
const f32r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getFloat32(0, true);
const f64w = (v: number|boolean) => { view.setFloat64(0, Number(v), true); return new Uint8Array(view.buffer.slice(0, 8)); };
const f64r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getFloat64(0, true);
const i64w = (v: bigint) => { view.setBigInt64(0, v, true); return new Uint8Array(view.buffer.slice(0, 8)); };
const i64r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getBigInt64(0, true);
const u64w = (v: bigint) => { view.setBigUint64(0, v, true); return new Uint8Array(view.buffer.slice(0, 8)); };
const u64r = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset).getBigUint64(0, true);

const enc = new TextEncoder();
const dec = new TextDecoder();

const jsonHeaderCodec = <K extends "frame"|"multipart"|"ciphertext"|"signature"|"hmac"|"webtransport"|"keypair"|"certificate"|"tensor"|"pointcloud">(
  type: K,
  getHeader: (c: Extract<Chunk, { type: K }>) => unknown,
  getPayload: (c: Extract<Chunk, { type: K }>) => Uint8Array,
  build: (header: unknown, payload: Uint8Array, meta?: Record<string, unknown>) => Extract<Chunk, { type: K }>,
): ChunkCodec<Extract<Chunk, { type: K }>> => ({
  encode: (c) => {
    const header = enc.encode(JSON.stringify(getHeader(c)));
    const payload = getPayload(c);
    const hlen = new Uint8Array(4);
    new DataView(hlen.buffer).setUint32(0, header.length, false);
    const out = new Uint8Array(4 + header.length + payload.length);
    out.set(hlen, 0); out.set(header, 4); out.set(payload, 4 + header.length);
    return out;
  },
  decode: (b, meta) => {
    const hlen = new DataView(b.buffer, b.byteOffset).getUint32(0, false);
    const header: unknown = JSON.parse(dec.decode(b.subarray(4, 4 + hlen)));
    return build(header, b.subarray(4 + hlen), meta);
  },
});

export const EMBEDDING_CODEC: ChunkCodec<Extract<Chunk, { type: "embedding" }>> = {
  encode: (c) => new Uint8Array(c.data.buffer, c.data.byteOffset, c.data.byteLength),
  decode: (b, meta) => {
    const data = new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    return meta !== undefined ? { type: "embedding", data, meta } : { type: "embedding", data };
  },
};

export const NULL_CODEC: ChunkCodec<Extract<Chunk, { type: "null" }>> = {
  encode: () => new Uint8Array(0),
  decode: (_, meta) => meta !== undefined ? { type: "null", data: null, meta } : { type: "null", data: null },
};

const COMPLEX_CODEC = <K extends "complex64"|"complex128">(type: K, fw: (v: number|boolean) => Uint8Array, fr: (b: Uint8Array, o: number) => number): ChunkCodec<Extract<Chunk, { type: K }>> => {
  const sz = fw(0).length;
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => { const d = c as { data: { re: number; im: number } }; const out = new Uint8Array(sz*2); out.set(fw(d.data.re),0); out.set(fw(d.data.im),sz); return out; },
    decode: (b, meta) => { const dv = new DataView(b.buffer, b.byteOffset); const data = { re: fr(b, 0), im: fr(b, sz) }; return (meta !== undefined ? { type, data, meta } : { type, data }) as T; },
  };
};

export const BINARY_CODECS = {
  binary: pass("binary"), image: pass("image"), video: pass("video"),
  audio: pass("audio"), pdf: pass("pdf"), archive: pass("archive"),
  protobuf: pass("protobuf"), msgpack: pass("msgpack"), cbor: pass("cbor"),
  arrow: pass("arrow"), parquet: pass("parquet"),
  wasm: pass("wasm"), font: pass("font"), onnx: pass("onnx"),
  safetensors: pass("safetensors"), epub: pass("epub"), docx: pass("docx"),
  xlsx: pass("xlsx"), pptx: pass("pptx"), gltf: pass("gltf"), qrcode: pass("qrcode"),
  dns: pass("dns"), dhcp: pass("dhcp"), icmp: pass("icmp"),
  embedding: EMBEDDING_CODEC,
  null: NULL_CODEC,
  frame: jsonHeaderCodec("frame",
    (c) => ({ width: c.data.width, height: c.data.height, format: c.data.format }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { width: number; height: number; format: string }; const data: FrameData = { ...hh, data: p }; return m !== undefined ? { type: "frame", data, meta: m } : { type: "frame", data }; },
  ),
  multipart: jsonHeaderCodec("multipart",
    (c) => ({ name: c.data.name, filename: c.data.filename, contentType: c.data.contentType }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { name: string; filename?: string; contentType?: string }; const mime = detectMime(p); const data: MultipartData = { ...hh, data: p }; const mm = m !== undefined ? { ...m, mime } : { mime }; return { type: "multipart", data, meta: mm }; },
  ),
  ciphertext: jsonHeaderCodec("ciphertext",
    (c) => ({ algo: c.data.algo, iv: Array.from(c.data.iv) }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { algo: string; iv: number[] }; const data: CiphertextData = { algo: hh.algo, iv: new Uint8Array(hh.iv), data: p }; return m !== undefined ? { type: "ciphertext", data, meta: m } : { type: "ciphertext", data }; },
  ),
  signature: jsonHeaderCodec("signature",
    (c) => ({ algo: c.data.algo }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { algo: string }; const data: SignatureData = { algo: hh.algo, data: p }; return m !== undefined ? { type: "signature", data, meta: m } : { type: "signature", data }; },
  ),
  hmac: jsonHeaderCodec("hmac",
    (c) => ({ algo: c.data.algo }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { algo: string }; const data: HmacData = { algo: hh.algo, data: p }; return m !== undefined ? { type: "hmac", data, meta: m } : { type: "hmac", data }; },
  ),
  keypair: jsonHeaderCodec("keypair",
    (c) => ({ algo: c.data.algo, privateKey: c.data.privateKey ? Array.from(c.data.privateKey) : undefined }),
    (c) => c.data.publicKey,
    (h, p, m) => { const hh = h as { algo: string; privateKey?: number[] }; const data: KeypairData = { algo: hh.algo, publicKey: p, ...(hh.privateKey !== undefined ? { privateKey: new Uint8Array(hh.privateKey) } : {}) }; return m !== undefined ? { type: "keypair", data, meta: m } : { type: "keypair", data }; },
  ),
  certificate: jsonHeaderCodec("certificate",
    (c) => ({ format: c.data.format }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { format: "pem" | "der" }; const data: CertificateData = { format: hh.format, data: p }; return m !== undefined ? { type: "certificate", data, meta: m } : { type: "certificate", data }; },
  ),
  tensor: jsonHeaderCodec("tensor",
    (c) => ({ shape: c.data.shape, dtype: c.data.dtype }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { shape: number[]; dtype: string }; const data: TensorData = { shape: hh.shape, dtype: hh.dtype, data: p }; return m !== undefined ? { type: "tensor", data, meta: m } : { type: "tensor", data }; },
  ),
  pointcloud: jsonHeaderCodec("pointcloud",
    (c) => ({ fields: c.data.fields }),
    (c) => new Uint8Array(c.data.points.buffer, c.data.points.byteOffset, c.data.points.byteLength),
    (h, p, m) => { const hh = h as { fields?: string[] }; const points = new Float32Array(p.buffer.slice(p.byteOffset, p.byteOffset + p.byteLength)); const data: PointcloudData = { points, ...(hh.fields !== undefined ? { fields: hh.fields } : {}) }; return m !== undefined ? { type: "pointcloud", data, meta: m } : { type: "pointcloud", data }; },
  ),
  webtransport: jsonHeaderCodec("webtransport",
    (c) => ({ sessionId: c.data.sessionId, streamId: c.data.streamId }),
    (c) => c.data.data,
    (h, p, m) => { const hh = h as { sessionId: string; streamId?: number }; const data: WebTransportData = { sessionId: hh.sessionId, data: p, ...(hh.streamId !== undefined ? { streamId: hh.streamId } : {}) }; return m !== undefined ? { type: "webtransport", data, meta: m } : { type: "webtransport", data }; },
  ),
  uint8:     fixedNum("uint8",     u8w,  u8r),
  int8:      fixedNum("int8",      i8w,  i8r),
  int16:     fixedNum("int16",     i16w, i16r),
  uint16:    fixedNum("uint16",    u16w, u16r),
  int32:     fixedNum("int32",     i32w, i32r),
  uint32:    fixedNum("uint32",    u32w, u32r),
  float32:   fixedNum("float32",   f32w, f32r),
  float64:   fixedNum("float64",   f64w, f64r),
  bool:      fixedNum("bool",      (v) => u8w(v ? 1 : 0), (b) => u8r(b) !== 0),
  timestamp: fixedNum("timestamp", f64w, f64r),
  int64:     fixedBig("int64",     i64w, i64r),
  uint64:    fixedBig("uint64",    u64w, u64r),
  complex64:  COMPLEX_CODEC("complex64",  f32w, (b, o) => new DataView(b.buffer, b.byteOffset).getFloat32(o, true)),
  complex128: COMPLEX_CODEC("complex128", f64w, (b, o) => new DataView(b.buffer, b.byteOffset).getFloat64(o, true)),
};
