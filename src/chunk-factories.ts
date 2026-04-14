import type {
  Chunk, HttpRequest, HttpResponse, WebSocketMessage, SseMessage,
  Token, ErrorData, SignalData, RpcMessage, EventData, SpanData,
  MetricData, LogData, CommandData, FrameData, PatchOp, MultipartData,
  SocketIoMessage, WebTransportData, EnvelopeData, HashData, SignatureData,
  TensorData, TimeseriesData, OhlcvData, AdjacencyData, PointcloudData,
  KeypairData, CertificateData, HmacData, CiphertextData, Complex,
} from "./chunk-types.js";
import type {
  JsonChunk, BinaryChunk, TextChunk, NdjsonChunk, CsvChunk,
  XmlChunk, YamlChunk, MarkdownChunk, HtmlChunk, SqlChunk,
  HttpRequestChunk, HttpResponseChunk, WebSocketChunk, SseChunk,
  AudioChunk, PdfChunk, ArchiveChunk, EmbeddingChunk, TokenChunk, DeltaChunk,
  Uint8Chunk, Int32Chunk, Float64Chunk, BoolChunk, TimestampChunk, UuidChunk,
  ErrorChunk, SignalChunk, NullChunk,
  ProtobufChunk, MsgpackChunk, CborChunk, ArrowChunk, ParquetChunk,
  GeojsonChunk, JwtChunk, GraphqlChunk,
  RpcChunk, EventChunk, SpanChunk, MetricChunk, LogChunk,
  CommandChunk, FrameChunk, PatchChunk, MultipartChunk,
  WasmChunk, FontChunk, OnnxChunk, SafetensorsChunk, EpubChunk,
  DocxChunk, XlsxChunk, PptxChunk, GltfChunk, QrcodeChunk,
  TomlChunk, IniChunk, JsonschemaChunk, AvroschemaChunk, SourcemapChunk,
  ShaderChunk, ObjChunk, SubtitleChunk, PlaylistChunk, GraphmlChunk,
  SocketIoChunk, WebTransportChunk, EnvelopeChunk, AckChunk, NackChunk,
  AstChunk, HashChunk, SignatureChunk, TensorChunk, TimeseriesChunk,
  OhlcvChunk, AdjacencyChunk, PointcloudChunk, KeypairChunk, CertificateChunk,
  HmacChunk, DnsChunk, DhcpChunk, IcmpChunk, CiphertextChunk,
  Int8Chunk, Int16Chunk, Uint16Chunk, Uint32Chunk, Int64Chunk, Uint64Chunk,
  Float32Chunk, Complex64Chunk, Complex128Chunk,
} from "./chunk-aliases.js";

type M = Record<string, unknown>;
const mk = <T extends Chunk>(base: Omit<T, "meta">, meta?: M): T =>
  (meta !== undefined ? { ...base, meta } : base) as T;

export const json      = <T>(data: T, meta?: M): JsonChunk<T>        => mk({ type: "json",      data }, meta);
export const binary    = (data: Uint8Array,  meta?: M): BinaryChunk  => mk({ type: "binary",    data }, meta);
export const text      = (data: string,      meta?: M): TextChunk    => mk({ type: "text",      data }, meta);
export const raw       = (data: unknown,     meta?: M): Extract<Chunk, { type: "raw" }>   => mk({ type: "raw",   data }, meta);
export const image     = (data: Uint8Array,  meta?: M): Extract<Chunk, { type: "image" }> => mk({ type: "image", data }, meta);
export const video     = (data: Uint8Array,  meta?: M): Extract<Chunk, { type: "video" }> => mk({ type: "video", data }, meta);
export const ndjson    = (data: string,      meta?: M): NdjsonChunk    => mk({ type: "ndjson",    data }, meta);
export const csv       = (data: string[],    meta?: M): CsvChunk       => mk({ type: "csv",       data }, meta);
export const xml       = (data: string,      meta?: M): XmlChunk       => mk({ type: "xml",       data }, meta);
export const yaml      = (data: string,      meta?: M): YamlChunk      => mk({ type: "yaml",      data }, meta);
export const markdown  = (data: string,      meta?: M): MarkdownChunk  => mk({ type: "markdown",  data }, meta);
export const html      = (data: string,      meta?: M): HtmlChunk      => mk({ type: "html",      data }, meta);
export const sql       = (data: string,      meta?: M): SqlChunk       => mk({ type: "sql",       data }, meta);
export const httpRequest  = (data: HttpRequest,      meta?: M): HttpRequestChunk  => mk({ type: "http-request",  data }, meta);
export const httpResponse = (data: HttpResponse,     meta?: M): HttpResponseChunk => mk({ type: "http-response", data }, meta);
export const websocket    = (data: WebSocketMessage, meta?: M): WebSocketChunk    => mk({ type: "websocket",     data }, meta);
export const sse          = (data: SseMessage,       meta?: M): SseChunk          => mk({ type: "sse",           data }, meta);
export const audio     = (data: Uint8Array,  meta?: M): AudioChunk    => mk({ type: "audio",     data }, meta);
export const pdf       = (data: Uint8Array,  meta?: M): PdfChunk      => mk({ type: "pdf",       data }, meta);
export const archive   = (data: Uint8Array,  meta?: M): ArchiveChunk  => mk({ type: "archive",   data }, meta);
export const embedding = (data: Float32Array,meta?: M): EmbeddingChunk => mk({ type: "embedding", data }, meta);
export const token     = (data: Token,       meta?: M): TokenChunk    => mk({ type: "token",     data }, meta);
export const delta     = (data: string,      meta?: M): DeltaChunk    => mk({ type: "delta",     data }, meta);
export const uint8     = (data: number,      meta?: M): Uint8Chunk    => mk({ type: "uint8",     data }, meta);
export const int32     = (data: number,      meta?: M): Int32Chunk    => mk({ type: "int32",     data }, meta);
export const float64   = (data: number,      meta?: M): Float64Chunk  => mk({ type: "float64",   data }, meta);
export const bool      = (data: boolean,     meta?: M): BoolChunk     => mk({ type: "bool",      data }, meta);
export const timestamp = (data: number,      meta?: M): TimestampChunk => mk({ type: "timestamp", data }, meta);
export const uuid      = (data: string,      meta?: M): UuidChunk     => mk({ type: "uuid",      data }, meta);
export const error     = (data: ErrorData,   meta?: M): ErrorChunk    => mk({ type: "error",     data }, meta);
export const signal    = (data: SignalData,  meta?: M): SignalChunk   => mk({ type: "signal",    data }, meta);
export const nil       = (meta?: M): NullChunk                         => mk({ type: "null", data: null }, meta);
export const protobuf  = (data: Uint8Array,  meta?: M): ProtobufChunk => mk({ type: "protobuf",  data }, meta);
export const msgpack   = (data: Uint8Array,  meta?: M): MsgpackChunk  => mk({ type: "msgpack",   data }, meta);
export const cbor      = (data: Uint8Array,  meta?: M): CborChunk     => mk({ type: "cbor",      data }, meta);
export const arrow     = (data: Uint8Array,  meta?: M): ArrowChunk    => mk({ type: "arrow",     data }, meta);
export const parquet   = (data: Uint8Array,  meta?: M): ParquetChunk  => mk({ type: "parquet",   data }, meta);
export const geojson   = (data: string,      meta?: M): GeojsonChunk  => mk({ type: "geojson",   data }, meta);
export const jwt       = (data: string,      meta?: M): JwtChunk      => mk({ type: "jwt",       data }, meta);
export const graphql   = (data: string,      meta?: M): GraphqlChunk  => mk({ type: "graphql",   data }, meta);
export const rpc       = (data: RpcMessage,  meta?: M): RpcChunk      => mk({ type: "rpc",       data }, meta);
export const event     = (data: EventData,   meta?: M): EventChunk    => mk({ type: "event",     data }, meta);
export const span      = (data: SpanData,    meta?: M): SpanChunk     => mk({ type: "span",      data }, meta);
export const metric    = (data: MetricData,  meta?: M): MetricChunk   => mk({ type: "metric",    data }, meta);
export const log       = (data: LogData,     meta?: M): LogChunk      => mk({ type: "log",       data }, meta);
export const command   = (data: CommandData, meta?: M): CommandChunk  => mk({ type: "command",   data }, meta);
export const frame     = (data: FrameData,   meta?: M): FrameChunk    => mk({ type: "frame",     data }, meta);
export const patch     = (data: PatchOp[],   meta?: M): PatchChunk    => mk({ type: "patch",     data }, meta);
export const multipart = (data: MultipartData,meta?: M): MultipartChunk => mk({ type: "multipart", data }, meta);
export const wasm      = (data: Uint8Array,  meta?: M): WasmChunk     => mk({ type: "wasm",      data }, meta);
export const font      = (data: Uint8Array,  meta?: M): FontChunk     => mk({ type: "font",      data }, meta);
export const onnx      = (data: Uint8Array,  meta?: M): OnnxChunk     => mk({ type: "onnx",      data }, meta);
export const safetensors = (data: Uint8Array,meta?: M): SafetensorsChunk => mk({ type: "safetensors", data }, meta);
export const epub      = (data: Uint8Array,  meta?: M): EpubChunk     => mk({ type: "epub",      data }, meta);
export const docx      = (data: Uint8Array,  meta?: M): DocxChunk     => mk({ type: "docx",      data }, meta);
export const xlsx      = (data: Uint8Array,  meta?: M): XlsxChunk     => mk({ type: "xlsx",      data }, meta);
export const pptx      = (data: Uint8Array,  meta?: M): PptxChunk     => mk({ type: "pptx",      data }, meta);
export const gltf      = (data: Uint8Array,  meta?: M): GltfChunk     => mk({ type: "gltf",      data }, meta);
export const qrcode    = (data: Uint8Array,  meta?: M): QrcodeChunk   => mk({ type: "qrcode",    data }, meta);
export const toml      = (data: string,      meta?: M): TomlChunk     => mk({ type: "toml",      data }, meta);
export const ini       = (data: string,      meta?: M): IniChunk      => mk({ type: "ini",       data }, meta);
export const jsonschema= (data: string,      meta?: M): JsonschemaChunk => mk({ type: "jsonschema", data }, meta);
export const avroschema= (data: string,      meta?: M): AvroschemaChunk => mk({ type: "avroschema", data }, meta);
export const sourcemap = (data: string,      meta?: M): SourcemapChunk => mk({ type: "sourcemap", data }, meta);
export const shader    = (data: string,      meta?: M): ShaderChunk   => mk({ type: "shader",    data }, meta);
export const obj       = (data: string,      meta?: M): ObjChunk      => mk({ type: "obj",       data }, meta);
export const subtitle  = (data: string,      meta?: M): SubtitleChunk => mk({ type: "subtitle",  data }, meta);
export const playlist  = (data: string,      meta?: M): PlaylistChunk => mk({ type: "playlist",  data }, meta);
export const graphml   = (data: string,      meta?: M): GraphmlChunk  => mk({ type: "graphml",   data }, meta);
export const socketio  = (data: SocketIoMessage,  meta?: M): SocketIoChunk    => mk({ type: "socketio",    data }, meta);
export const webtransport = (data: WebTransportData, meta?: M): WebTransportChunk => mk({ type: "webtransport", data }, meta);
export const envelope  = (data: EnvelopeData,meta?: M): EnvelopeChunk => mk({ type: "envelope",  data }, meta);
export const ack       = (data: string,      meta?: M): AckChunk      => mk({ type: "ack",       data }, meta);
export const nack      = (data: string,      meta?: M): NackChunk     => mk({ type: "nack",      data }, meta);
export const ast       = (data: unknown,     meta?: M): AstChunk      => mk({ type: "ast",       data }, meta);
export const hash      = (data: HashData,    meta?: M): HashChunk     => mk({ type: "hash",      data }, meta);
export const signature = (data: SignatureData,meta?: M): SignatureChunk => mk({ type: "signature", data }, meta);
export const tensor    = (data: TensorData,  meta?: M): TensorChunk   => mk({ type: "tensor",    data }, meta);
export const timeseries= (data: TimeseriesData,meta?: M): TimeseriesChunk => mk({ type: "timeseries", data }, meta);
export const ohlcv     = (data: OhlcvData,   meta?: M): OhlcvChunk    => mk({ type: "ohlcv",     data }, meta);
export const adjacency = (data: AdjacencyData,meta?: M): AdjacencyChunk => mk({ type: "adjacency", data }, meta);
export const pointcloud= (data: PointcloudData,meta?: M): PointcloudChunk => mk({ type: "pointcloud", data }, meta);
export const keypair   = (data: KeypairData, meta?: M): KeypairChunk  => mk({ type: "keypair",   data }, meta);
export const certificate = (data: CertificateData,meta?: M): CertificateChunk => mk({ type: "certificate", data }, meta);
export const hmac      = (data: HmacData,    meta?: M): HmacChunk     => mk({ type: "hmac",      data }, meta);
export const dns       = (data: Uint8Array,  meta?: M): DnsChunk      => mk({ type: "dns",       data }, meta);
export const dhcp      = (data: Uint8Array,  meta?: M): DhcpChunk     => mk({ type: "dhcp",      data }, meta);
export const icmp      = (data: Uint8Array,  meta?: M): IcmpChunk     => mk({ type: "icmp",      data }, meta);
export const ciphertext= (data: CiphertextData,meta?: M): CiphertextChunk => mk({ type: "ciphertext", data }, meta);
export const int8      = (data: number,      meta?: M): Int8Chunk     => mk({ type: "int8",      data }, meta);
export const int16     = (data: number,      meta?: M): Int16Chunk    => mk({ type: "int16",     data }, meta);
export const uint16    = (data: number,      meta?: M): Uint16Chunk   => mk({ type: "uint16",    data }, meta);
export const uint32    = (data: number,      meta?: M): Uint32Chunk   => mk({ type: "uint32",    data }, meta);
export const int64     = (data: bigint,      meta?: M): Int64Chunk    => mk({ type: "int64",     data }, meta);
export const uint64    = (data: bigint,      meta?: M): Uint64Chunk   => mk({ type: "uint64",    data }, meta);
export const float32   = (data: number,      meta?: M): Float32Chunk  => mk({ type: "float32",   data }, meta);
export const complex64 = (data: Complex,     meta?: M): Complex64Chunk => mk({ type: "complex64", data }, meta);
export const complex128= (data: Complex,     meta?: M): Complex128Chunk => mk({ type: "complex128", data }, meta);
