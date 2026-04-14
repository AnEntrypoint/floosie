import type { Chunk } from "./chunk-types.js";
import type { ChunkCodec } from "./codec-types.js";

const enc = new TextEncoder();
const dec = new TextDecoder();

const utf8Codec = <K extends
  "text" | "ndjson" | "xml" | "yaml" | "markdown" | "html" | "sql" | "delta" | "uuid" |
  "geojson" | "jwt" | "graphql" |
  "toml" | "ini" | "jsonschema" | "avroschema" | "sourcemap" | "shader" | "obj" | "subtitle" | "playlist" | "graphml"
>(
  type: K,
): ChunkCodec<Extract<Chunk, { type: K }>> => {
  type T = Extract<Chunk, { type: K }>;
  return {
    encode: (c) => enc.encode((c as { data: string }).data),
    decode: (b, meta) => {
      const data = dec.decode(b);
      return (meta !== undefined ? { type, data, meta } : { type, data }) as T;
    },
  };
};

export const JSON_CODEC: ChunkCodec<Extract<Chunk, { type: "json" }>> = {
  encode: (c) => enc.encode(JSON.stringify(c.data)),
  decode: (b, meta) => {
    const str = dec.decode(b);
    try {
      const data: unknown = JSON.parse(str);
      return meta !== undefined ? { type: "json", data, meta } : { type: "json", data };
    } catch (e) {
      throw new Error(`json decode failed: ${str.slice(0, 80)} — ${String(e)}`);
    }
  },
};

export const RAW_CODEC: ChunkCodec<Extract<Chunk, { type: "raw" }>> = {
  encode: (c) => enc.encode(JSON.stringify(c.data)),
  decode: (b, meta) => {
    const data: unknown = JSON.parse(dec.decode(b));
    return meta !== undefined ? { type: "raw", data, meta } : { type: "raw", data };
  },
};

export const CSV_CODEC: ChunkCodec<Extract<Chunk, { type: "csv" }>> = {
  encode: (c) => enc.encode(c.data.map((f) => (f.includes(",") || f.includes('"') ? `"${f.replace(/"/g, '""')}"` : f)).join(",")),
  decode: (b, meta) => {
    const line = dec.decode(b);
    const data: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (ch === '"' && inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { data.push(cur); cur = ""; continue; }
      cur += ch;
    }
    data.push(cur);
    return meta !== undefined ? { type: "csv", data, meta } : { type: "csv", data };
  },
};

export const TEXT_CODECS = {
  json:     JSON_CODEC,
  raw:      RAW_CODEC,
  csv:      CSV_CODEC,
  text:     utf8Codec("text"),
  ndjson:   utf8Codec("ndjson"),
  xml:      utf8Codec("xml"),
  yaml:     utf8Codec("yaml"),
  markdown: utf8Codec("markdown"),
  html:     utf8Codec("html"),
  sql:      utf8Codec("sql"),
  delta:    utf8Codec("delta"),
  uuid:     utf8Codec("uuid"),
  geojson:  utf8Codec("geojson"),
  jwt:      utf8Codec("jwt"),
  graphql:  utf8Codec("graphql"),
  toml:     utf8Codec("toml"),
  ini:      utf8Codec("ini"),
  jsonschema: utf8Codec("jsonschema"),
  avroschema: utf8Codec("avroschema"),
  sourcemap:  utf8Codec("sourcemap"),
  shader:   utf8Codec("shader"),
  obj:      utf8Codec("obj"),
  subtitle: utf8Codec("subtitle"),
  playlist: utf8Codec("playlist"),
  graphml:  utf8Codec("graphml"),
};
