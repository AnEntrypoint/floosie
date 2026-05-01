# floosie

Universal stream processing platform. Pipe anything to anything.

Built on [sflow](https://www.npmjs.com/package/sflow) with a 98-type chunk model, byte-level utilities, observability, WebSocket bridging, ACP bridging, and a CLI.

```sh
npm install floosie
```

## Quick start

```ts
import { createProcessor, json, text } from "floosie";

const upper = createProcessor({
  name: "upper",
  input: (async function* () {
    yield json({ msg: "hello" });
    yield json({ msg: "world" });
  })(),
  transform: (flow) => flow.map((c) => text(String(c.data.msg).toUpperCase())),
});

for await (const c of upper.output) console.log(c.data);
// HELLO
// WORLD
```

## CLI

```sh
floosie pipe --in file:data.json --out ws://localhost:7878
floosie bridge --port 7878
floosie mux --urls ws://a:7878,ws://b:7878 --strategy round-robin
floosie inspect data.bin
cat data | floosie pipe --in stdio --type json --out file:out.ndjson
```

Sources / sinks: `file:<path>`, `ws://<url>`, `wss://<url>`, `stdio` (default).

## Pillars

### Chunks (98 types)
Structured (`json`, `ndjson`, `rpc`, `event`, `metric`, `log`, `command`, `patch`, `token`, `error`, `signal`, …),
text (`text`, `markdown`, `xml`, `yaml`, `html`, `sql`, `csv`, `geojson`, `graphql`, …),
network (`http-request`, `http-response`, `websocket`, `sse`, `dns`, `dhcp`, `icmp`),
binary/media (`image`, `video`, `audio`, `pdf`, `archive`, `protobuf`, `msgpack`, `cbor`, `arrow`, `parquet`, `wasm`, `font`, `onnx`, `safetensors`, `epub`, `docx`, `xlsx`, `pptx`, `gltf`, `qrcode`, …),
binary with JSON header (`frame`, `multipart`, `ciphertext`, `signature`, `hmac`, `keypair`, `certificate`, `tensor`, `pointcloud`, `webtransport`),
scalars (`uint8`/`int8`/`int16`/`uint16`/`int32`/`uint32`/`int64`/`uint64`/`float32`/`float64`/`bool`/`timestamp`/`complex64`/`complex128`/`null`),
embedding (Float32Array).

Each chunk type ships an `encode`/`decode` codec; `encodeChunk(c)` and `decodeChunk(type, bytes, meta?)` use the registry. Binary decode auto-populates `meta.mime`.

### Processors and pipelines

```ts
import { createProcessor, pipe, registry } from "floosie";

const a = createProcessor({ name: "a", transform: (f) => f.map(...) });
const b = createProcessor({ name: "b", transform: (f) => f.filter(...) });
const composed = a.pipe(b);
for await (const c of composed.output) ...
registry.snapshot(); // [{ name, status, chunksIn, chunksOut, errors, uptimeMs }, …]
```

Lifecycle is a 4-state actor in `src/machine.ts` — `idle → running → error | stopped` — usable directly via `createProcessorActor(name)`.

### Operators

```ts
import { mux, split, gate, scan, zip, batch, window, throttle, debounce,
         take, drop, distinct, parallel, withBackpressure } from "floosie";
```

| operator | description |
|---|---|
| `mux(...sources)` | merge N input streams (interleaved) |
| `split(flow, n)` | fan-out one stream into N branches |
| `gate(pred)` | async predicate filter |
| `scan(fn, seed)` | running accumulator |
| `zip(...sources)` | combine N streams into tuples |
| `batch(n)` / `window(ms)` | group by count or time |
| `throttle(ms)` / `debounce(ms)` | rate-limit |
| `take(n)` / `drop(n)` / `distinct(keyFn?)` | classic combinators |
| `parallel(fn, n)` | concurrent async map |
| `withBackpressure(hwm)` | pause upstream at high-water mark |

### Buffer utilities (`floosie/buffer`)

Codec-style helpers for the byte layer:

```ts
import { toHex, fromHex, toBase64, fromBase64, toBase64Url, toBase32,
         concat, slice, indexOf, splitBytes, equals, hexdump,
         digest, hmacDigest, rand,
         gzip, gunzip, brotli, unbrotli, compress, decompress,
         rechunk, splitOn, mapBytes, tap } from "floosie";
```

`rechunk(size)` repacks a byte stream into fixed-size frames; `splitOn(sep)` splits on an arbitrary delimiter; `digest`/`hmacDigest` hash via `node:crypto`; `gzip`/`brotli` via `node:zlib`. `hexdump(b)` produces classic offset/hex/ASCII output.

### Observability (`floosie/debug`)

```ts
import { debugSnapshot, debugLog, debugLogs, setLogSink } from "floosie";

debugLog("my-subsystem", "info", "started");
debugSnapshot();    // { ts, processors, recentLogs, totals }
debugLogs();        // last 200 entries (ring buffer)
setLogSink((e) => myObserver(e));
```

Registry lifecycle transitions auto-emit log entries with `subsystem: "registry"`.

### MIME detection

```ts
import { detectMime, detectFile, mimeToChunkType } from "floosie";

detectMime(bytes);         // sync, critical-path; returns MIME or "application/octet-stream"
await detectFile(bytes);   // async, 183 formats via file-type
mimeToChunkType("image/png"); // "image"
```

### WebSocket bridging

```ts
import { wsSource, wsSink, wsBridge, muxWsClients,
         encodeWsFrame, decodeWsFrame } from "floosie";

const server = await wsBridge({ port: 7878 });
server.broadcast(json({ hello: "world" }));
for await (const c of server.source()) ...

const remote = wsSource("ws://other:7878");
await wsSink("ws://elsewhere:7878", remote);

const fanout = await muxWsClients(["ws://a", "ws://b", "ws://c"]);
fanout.send(chunk, "round-robin"); // or "broadcast" or "hash"
```

### ACP

```ts
import { acpSource, acpSink, acpProcessor } from "floosie/acp";
```

Wraps an `AgentSideConnection` as a source / sink, or as a full processor.

### File I/O

```ts
import { fileSource, fileLineSource, fileSink } from "floosie";

for await (const c of fileSource("data.json")) ...    // auto-detects mime
for await (const c of fileLineSource("logs.ndjson")) ... // newline-framed
await fileSink("out.ndjson", iter);
```

## Sub-path exports

`floosie`, `floosie/acp`, `floosie/stdio`, `floosie/registry`, `floosie/debug`, `floosie/buffer`, `floosie/file`, `floosie/ws`, `floosie/cli`, `floosie/auto`.

## Status

- Single integration test: `node test.js`
- TypeScript strict, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- Lint: `npm run lint`
- Build: `npm run build`
