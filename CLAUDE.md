# floosie

Universal stream processing platform. Pipe anything to anything.

## Architecture

- `src/chunk.ts` — `Chunk` discriminated union: json/binary/text/image/video/raw + factory fns
- `src/codec.ts` — `CODECS` registry: encode/decode per chunk type; passthrough for binary; ndjson for json/raw; newline for text
- `src/node.ts` — `StreamNode<I,O>`: composable sflow-backed pipe unit, lazy until iterated
- `src/processor.ts` — `createProcessor()`: single-call SDK entry; auto-detects stream type; tracks state via registry; `pipe()` composes transforms
- `src/pipeline.ts` — `pipe()`, `connect()`, `source()`, `sink()` — pipeline composition
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

### Dependencies & TypeScript
- **@agentclientprotocol/sdk v0.19.0** has TS 5.x export ambiguity — requires `skipLibCheck: true` in tsconfig
- **exactOptionalPropertyTypes: true** requires conditional spread: `meta !== undefined ? { ...o, meta } : { ...o }`
- **Node v23.10** — native ESM, Web Streams built-in

## Changes

### 0.1.0 — 2026-04-14
- Initial platform: Chunk types, CODECS, StreamNode, createProcessor, pipeline wiring, registry, stdio adapter, ACP connector
