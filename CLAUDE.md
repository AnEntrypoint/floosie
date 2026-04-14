# floosie

Universal stream processing platform. Pipe anything to anything.

## Architecture

- `src/chunk.ts` — `Chunk` discriminated union: 98 types + factory fns
- `src/chunk-types.ts` — type definitions and data interfaces
- `src/chunk-aliases.ts` — Extract<Chunk,{type:K}> aliases for all 98 types
- `src/chunk-factories.ts` — factory functions
- `src/codec.ts` — `CODECS` registry: encode/decode per chunk type; passthrough for binary; ndjson for json/raw; newline for text
- `src/codec-text.ts` — text/markup codecs; `src/codec-binary.ts` — binary/media codecs; `src/codec-structured.ts` — JSON-envelope codecs
- `src/mime.ts` — `detectMime(Uint8Array): string`; magic-byte detection for 35 formats; auto-populated in binary decode meta
- `src/file-detect.ts` — `detectFile()` async using file-type v22.0.1 (183 formats); `detectMime()` stays sync for codec decode paths; UTF-16 BOM checked first (file-type misdetects 0xff 0xfe as audio/mpeg)
- `src/node.ts` — `StreamNode<I,O>`: composable sflow-backed pipe unit, lazy until iterated
- `src/processor.ts` — `createProcessor()`: single-call SDK entry; auto-detects stream type; tracks state via registry; `pipe()` composes transforms
- `src/pipeline.ts` — `pipe()`, `connect()`, `source()`, `sink()` — pipeline composition
- `src/operators.ts` — `mux`, `split`, `gate`, `scan`, `zip`, `withBackpressure`, `batch`, `window`, `throttle`, `debounce`, `take`, `drop`, `distinct`, `parallel`
- `src/registry.ts` — global `ProcessorState` map; `inspect()` / `snapshot()` for observability
- `src/stdio.ts` — `stdioProcessor()`: reads stdin, writes stdout; framing auto-selected by chunk type
- `src/acp.ts` — `acpSource()`, `acpSink()`, `acpProcessor()`: ACP AgentSideConnection as stream source/sink
- `src/index.ts` — re-exports all public API

## Key Technical Facts

### sflow Type Union
`sflow` is `ReadableStream<T> & AsyncIterableIterator<T> & BaseFlow<T>` — works with both Web Streams API and ES6 async iteration.

### FlowSource Inputs
Accepts: Promise, Iterable, AsyncIterable, `() => Iterable/AsyncIterable`, ReadableLike, ReadableStream.

### Terminal Methods
`sflow` provides: `.toArray()`, `.run()`, `.to(writable)`, `.toEnd()`, `.toNil()`, `.toCount()`, `.toFirst()` — one must be called to consume the stream.

### ProcessorHandle.pipe()
Composes transforms (not streams) — upstream input is preserved and both transforms are fused into one `createProcessor` call.

### sflow API Behaviors (Witnessed)
Working: `merge(other)`, `limit(n)`, `skip(n)`, `chunk(n)`, `chunkInterval(ms)`, `throttle(ms)`, `debounce(ms)`, `uniq()`, `uniqBy(fn)`, `pMap(fn, { concurrency: N })`, `through(async function*(src){})`

Broken/avoid: `head(n)` hangs on finite sources — use `limit(n)`; `confluenceByZip(other)` throws on AsyncIterable input; `chunkBy(number)` hangs — pass a comparator function; `forkTo()` returns empty; `reduceEmit()` emits nulls.

Custom zip (replaces confluenceByZip):
```ts
sflow(async function*() {
  const iters = sources.map(s => s[Symbol.asyncIterator]());
  while (true) {
    const nexts = await Promise.all(iters.map(it => it.next()));
    if (nexts.some(n => n.done)) break;
    yield nexts.map(n => n.value);
  }
}())
```

### File-Type Detection

**file-type v22.0.1 caveat:** Misdetects UTF-16 LE BOM (0xff 0xfe) as audio/mpeg (MP1). Always check UTF-16 BOM first in detection pipeline before calling file-type.

**detectFile() vs detectMime():** `detectFile()` is async (uses file-type, 183 formats); `detectMime()` is sync (hand-rolled SIGS table, 35 formats) for use in synchronous codec decode paths.

**Text heuristic:** If >30% of first 512 bytes have values >127, return application/octet-stream. Otherwise run TEXT_PATTERNS regex. FileInfo type: `{ mime: string; ext?: string; charset?: string; description?: string }`

### Dependencies & TypeScript
- **@agentclientprotocol/sdk v0.19.0** has TS 5.x export ambiguity — requires `skipLibCheck: true` in tsconfig
- **exactOptionalPropertyTypes: true** requires conditional spread: `meta !== undefined ? { ...o, meta } : { ...o }`
- **Node v23.10** — native ESM, Web Streams built-in

### xstate v5.30.0 (ProcessorMachine)
- **createMachine({id, initial, context: ({input}) => ctx, states})** — context is a function receiving {input}
- **createActor(machine, {input})** — creates and returns actor
- **actor.start()**, **actor.send({type})**, **actor.getSnapshot().value**, **actor.getSnapshot().context**
- **getSnapshot().context type issue:** inferred as function type, not context shape — cast as `actor.getSnapshot().context as unknown as ProcessorContext`
- **Nullable function narrowing:** `let wake: (() => void) | null` doesn't narrow with `if (wake) wake()` — use ref pattern: `const ref: {v: (() => void) | null} = {v: null}; const fn = ref.v; ref.v = null; if (fn) fn()`

## Changes

### 0.6.0 — 2026-04-14
- Added `src/machine.ts` (ProcessorMachine xstate); `src/streams.ts` (splitStream)
- ProcessorHandle dual stdout/stderr streams; process.stderr for error/signal chunks
- Registry stores Actor per processor; status/context read from actor snapshot
- Processor lifecycle: idle/running/error/stopped via state machine

### 0.5.0 — 2026-04-14
- (Release gap — not documented)

### 0.4.0 — 2026-04-14
- Added `src/operators.ts`: mux, split, gate, scan, zip, withBackpressure, batch, window, throttle, debounce, take, drop, distinct, parallel

### 0.3.0 — 2026-04-14
- Added 52 new chunk types (98 total): wasm, font, onnx, safetensors, epub, docx, xlsx, pptx, gltf, qrcode, toml, ini, jsonschema, avroschema, sourcemap, shader, obj, subtitle, playlist, graphml, socketio, webtransport, envelope, ack, nack, ast, hash, signature, tensor, timeseries, ohlcv, adjacency, pointcloud, keypair, certificate, hmac, dns, dhcp, icmp, ciphertext, int8, int16, uint16, uint32, int64, uint64, float32, complex64, complex128
- Added `src/chunk-aliases.ts`: Extract<Chunk,{type:K}> aliases split from chunk-types.ts

### 0.2.0 — 2026-04-14
- Added 17 new chunk types: protobuf, msgpack, cbor, arrow, parquet, geojson, jwt, graphql, rpc, event, span, metric, log, command, frame, patch, multipart (49 total)
- Added `src/mime.ts`: magic-byte detection for 35 formats, auto-populated as `meta.mime` on all binary decode

### 0.1.0 — 2026-04-14
- Initial platform: Chunk types, CODECS, StreamNode, createProcessor, pipeline wiring, registry, stdio adapter, ACP connector

## Repository

- **Git remote:** "anentrypoint" (https://github.com/AnEntrypoint/floosie)
- **GitHub Pages:** Published from `docs/` directory
- **dist/ tracking:** Previously tracked, removed via `git rm --cached dist/`, now in .gitignore
