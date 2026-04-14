export type ChunkType =
  | "json" | "binary" | "text" | "image" | "video" | "raw"
  | "ndjson" | "csv" | "xml" | "yaml" | "markdown" | "html" | "sql"
  | "http-request" | "http-response" | "websocket" | "sse"
  | "audio" | "pdf" | "archive"
  | "embedding" | "token" | "delta"
  | "uint8" | "int32" | "float64" | "bool" | "timestamp" | "uuid"
  | "error" | "signal" | "null"
  | "protobuf" | "msgpack" | "cbor" | "arrow" | "parquet"
  | "geojson" | "jwt" | "graphql"
  | "rpc" | "event" | "span" | "metric" | "log" | "command" | "frame" | "patch" | "multipart"
  | "wasm" | "font" | "onnx" | "safetensors" | "epub" | "docx" | "xlsx" | "pptx" | "gltf" | "qrcode"
  | "toml" | "ini" | "jsonschema" | "avroschema" | "sourcemap" | "shader" | "obj" | "subtitle" | "playlist" | "graphml"
  | "socketio" | "webtransport" | "envelope" | "ack" | "nack" | "ast" | "hash" | "signature"
  | "tensor" | "timeseries" | "ohlcv" | "adjacency" | "pointcloud" | "keypair" | "certificate" | "hmac"
  | "dns" | "dhcp" | "icmp" | "ciphertext"
  | "int8" | "int16" | "uint16" | "uint32" | "int64" | "uint64" | "float32" | "complex64" | "complex128";

export type HttpRequest        = { method: string; url: string; headers: Record<string, string>; body?: Uint8Array };
export type HttpResponse       = { status: number; headers: Record<string, string>; body?: Uint8Array };
export type WebSocketMessage   = { kind: "text" | "binary"; payload: string | Uint8Array };
export type SseMessage         = { data: string; event?: string; id?: string };
export type Token              = { id: number; text: string };
export type ErrorData          = { message: string; code?: string; stack?: string };
export type SignalData         = { kind: string; payload?: unknown };
export type RpcMessage         = { id: string; method: string; params?: unknown; result?: unknown; error?: unknown };
export type EventData          = { type: string; target?: string; data?: unknown; timestamp?: number };
export type SpanData           = { traceId: string; spanId: string; name: string; start: number; end?: number; attrs?: Record<string, unknown> };
export type MetricData         = { name: string; value: number; labels?: Record<string, string>; timestamp?: number };
export type LogData            = { level: string; message: string; timestamp?: number; attrs?: Record<string, unknown> };
export type CommandData        = { cmd: string; args?: string[]; env?: Record<string, string> };
export type FrameData          = { width: number; height: number; format: string; data: Uint8Array };
export type PatchOp            = { op: string; path: string; value?: unknown };
export type MultipartData      = { name: string; filename?: string; contentType?: string; data: Uint8Array };
export type SocketIoMessage    = { namespace: string; event: string; data: unknown };
export type WebTransportData   = { sessionId: string; streamId?: number; data: Uint8Array };
export type EnvelopeData       = { headers: Record<string, string>; body: unknown };
export type HashData           = { algo: string; hex: string };
export type SignatureData       = { algo: string; data: Uint8Array };
export type TensorData         = { shape: number[]; dtype: string; data: Uint8Array };
export type TimeseriesData     = { timestamps: number[]; values: number[]; name?: string };
export type OhlcvData          = { open: number; high: number; low: number; close: number; volume: number; timestamp: number };
export type AdjacencyData      = { nodes: string[]; edges: Array<[string, string, unknown?]> };
export type PointcloudData     = { points: Float32Array; fields?: string[] };
export type KeypairData        = { publicKey: Uint8Array; privateKey?: Uint8Array; algo: string };
export type CertificateData    = { data: Uint8Array; format: "pem" | "der" };
export type HmacData           = { algo: string; data: Uint8Array };
export type CiphertextData     = { algo: string; iv: Uint8Array; data: Uint8Array };
export type Complex            = { re: number; im: number };

export type Chunk<T = unknown> =
  | { type: "json";          data: T;                  meta?: Record<string, unknown> }
  | { type: "binary";        data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "text";          data: string;             meta?: Record<string, unknown> }
  | { type: "image";         data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "video";         data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "raw";           data: unknown;            meta?: Record<string, unknown> }
  | { type: "ndjson";        data: string;             meta?: Record<string, unknown> }
  | { type: "csv";           data: string[];           meta?: Record<string, unknown> }
  | { type: "xml";           data: string;             meta?: Record<string, unknown> }
  | { type: "yaml";          data: string;             meta?: Record<string, unknown> }
  | { type: "markdown";      data: string;             meta?: Record<string, unknown> }
  | { type: "html";          data: string;             meta?: Record<string, unknown> }
  | { type: "sql";           data: string;             meta?: Record<string, unknown> }
  | { type: "http-request";  data: HttpRequest;        meta?: Record<string, unknown> }
  | { type: "http-response"; data: HttpResponse;       meta?: Record<string, unknown> }
  | { type: "websocket";     data: WebSocketMessage;   meta?: Record<string, unknown> }
  | { type: "sse";           data: SseMessage;         meta?: Record<string, unknown> }
  | { type: "audio";         data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "pdf";           data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "archive";       data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "embedding";     data: Float32Array;       meta?: Record<string, unknown> }
  | { type: "token";         data: Token;              meta?: Record<string, unknown> }
  | { type: "delta";         data: string;             meta?: Record<string, unknown> }
  | { type: "uint8";         data: number;             meta?: Record<string, unknown> }
  | { type: "int32";         data: number;             meta?: Record<string, unknown> }
  | { type: "float64";       data: number;             meta?: Record<string, unknown> }
  | { type: "bool";          data: boolean;            meta?: Record<string, unknown> }
  | { type: "timestamp";     data: number;             meta?: Record<string, unknown> }
  | { type: "uuid";          data: string;             meta?: Record<string, unknown> }
  | { type: "error";         data: ErrorData;          meta?: Record<string, unknown> }
  | { type: "signal";        data: SignalData;         meta?: Record<string, unknown> }
  | { type: "null";          data: null;               meta?: Record<string, unknown> }
  | { type: "protobuf";      data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "msgpack";       data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "cbor";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "arrow";         data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "parquet";       data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "geojson";       data: string;             meta?: Record<string, unknown> }
  | { type: "jwt";           data: string;             meta?: Record<string, unknown> }
  | { type: "graphql";       data: string;             meta?: Record<string, unknown> }
  | { type: "rpc";           data: RpcMessage;         meta?: Record<string, unknown> }
  | { type: "event";         data: EventData;          meta?: Record<string, unknown> }
  | { type: "span";          data: SpanData;           meta?: Record<string, unknown> }
  | { type: "metric";        data: MetricData;         meta?: Record<string, unknown> }
  | { type: "log";           data: LogData;            meta?: Record<string, unknown> }
  | { type: "command";       data: CommandData;        meta?: Record<string, unknown> }
  | { type: "frame";         data: FrameData;          meta?: Record<string, unknown> }
  | { type: "patch";         data: PatchOp[];          meta?: Record<string, unknown> }
  | { type: "multipart";     data: MultipartData;      meta?: Record<string, unknown> }
  | { type: "wasm";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "font";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "onnx";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "safetensors";   data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "epub";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "docx";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "xlsx";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "pptx";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "gltf";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "qrcode";        data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "toml";          data: string;             meta?: Record<string, unknown> }
  | { type: "ini";           data: string;             meta?: Record<string, unknown> }
  | { type: "jsonschema";    data: string;             meta?: Record<string, unknown> }
  | { type: "avroschema";    data: string;             meta?: Record<string, unknown> }
  | { type: "sourcemap";     data: string;             meta?: Record<string, unknown> }
  | { type: "shader";        data: string;             meta?: Record<string, unknown> }
  | { type: "obj";           data: string;             meta?: Record<string, unknown> }
  | { type: "subtitle";      data: string;             meta?: Record<string, unknown> }
  | { type: "playlist";      data: string;             meta?: Record<string, unknown> }
  | { type: "graphml";       data: string;             meta?: Record<string, unknown> }
  | { type: "socketio";      data: SocketIoMessage;    meta?: Record<string, unknown> }
  | { type: "webtransport";  data: WebTransportData;   meta?: Record<string, unknown> }
  | { type: "envelope";      data: EnvelopeData;       meta?: Record<string, unknown> }
  | { type: "ack";           data: string;             meta?: Record<string, unknown> }
  | { type: "nack";          data: string;             meta?: Record<string, unknown> }
  | { type: "ast";           data: unknown;            meta?: Record<string, unknown> }
  | { type: "hash";          data: HashData;           meta?: Record<string, unknown> }
  | { type: "signature";     data: SignatureData;      meta?: Record<string, unknown> }
  | { type: "tensor";        data: TensorData;         meta?: Record<string, unknown> }
  | { type: "timeseries";    data: TimeseriesData;     meta?: Record<string, unknown> }
  | { type: "ohlcv";         data: OhlcvData;          meta?: Record<string, unknown> }
  | { type: "adjacency";     data: AdjacencyData;      meta?: Record<string, unknown> }
  | { type: "pointcloud";    data: PointcloudData;     meta?: Record<string, unknown> }
  | { type: "keypair";       data: KeypairData;        meta?: Record<string, unknown> }
  | { type: "certificate";   data: CertificateData;    meta?: Record<string, unknown> }
  | { type: "hmac";          data: HmacData;           meta?: Record<string, unknown> }
  | { type: "dns";           data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "dhcp";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "icmp";          data: Uint8Array;         meta?: Record<string, unknown> }
  | { type: "ciphertext";    data: CiphertextData;     meta?: Record<string, unknown> }
  | { type: "int8";          data: number;             meta?: Record<string, unknown> }
  | { type: "int16";         data: number;             meta?: Record<string, unknown> }
  | { type: "uint16";        data: number;             meta?: Record<string, unknown> }
  | { type: "uint32";        data: number;             meta?: Record<string, unknown> }
  | { type: "int64";         data: bigint;             meta?: Record<string, unknown> }
  | { type: "uint64";        data: bigint;             meta?: Record<string, unknown> }
  | { type: "float32";       data: number;             meta?: Record<string, unknown> }
  | { type: "complex64";     data: Complex;            meta?: Record<string, unknown> }
  | { type: "complex128";    data: Complex;            meta?: Record<string, unknown> };
