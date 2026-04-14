# floosie

Universal stream processing platform. Pipe anything to anything.

Built on [sflow](https://www.npmjs.com/package/sflow) with [ACP](https://www.npmjs.com/package/@agentclientprotocol/sdk) support.

## Install

```sh
npm install
```

## Quick start

```ts
import { createProcessor, json, text } from "./src/index.js";
import type { JsonChunk, TextChunk } from "./src/index.js";

const upper = createProcessor<JsonChunk<{ msg: string }>, TextChunk>({
  name: "upper",
  input: (async function* () {
    yield json({ msg: "hello" });
    yield json({ msg: "world" });
  })(),
  transform: (flow) => flow.map((chunk) => text(chunk.data.msg.toUpperCase())),
});

const exclaim = createProcessor<TextChunk, TextChunk>({
  name: "exclaim",
  transform: (flow) => flow.map((chunk) => text(chunk.data + "!!!")),
});

for await (const chunk of upper.pipe(exclaim).output) {
  console.log(chunk.data); // HELLO!!!  WORLD!!!
}
```

## Chunk types (49)

### Structured / JSON
| type | data | framing |
|------|------|---------|
| `json` | `T` (any) | ndjson |
| `raw` | `unknown` | ndjson |
| `ndjson` | `string` | newline |
| `rpc` | `RpcMessage` | ndjson |
| `event` | `EventData` | ndjson |
| `span` | `SpanData` | ndjson |
| `metric` | `MetricData` | ndjson |
| `log` | `LogData` | ndjson |
| `command` | `CommandData` | ndjson |
| `patch` | `PatchOp[]` | ndjson |
| `token` | `Token` | ndjson |
| `error` | `ErrorData` | ndjson |
| `signal` | `SignalData` | ndjson |

### Text / Markup
| type | data | framing |
|------|------|---------|
| `text` | `string` | newline |
| `delta` | `string` | newline |
| `uuid` | `string` | newline |
| `jwt` | `string` | newline |
| `xml` | `string` | length-prefix |
| `yaml` | `string` | length-prefix |
| `markdown` | `string` | length-prefix |
| `html` | `string` | length-prefix |
| `sql` | `string` | length-prefix |
| `geojson` | `string` | length-prefix |
| `graphql` | `string` | length-prefix |
| `csv` | `string[]` | newline |

### Network / Protocol
| type | data | framing |
|------|------|---------|
| `http-request` | `HttpRequest` | length-prefix |
| `http-response` | `HttpResponse` | length-prefix |
| `websocket` | `WebSocketMessage` | length-prefix |
| `sse` | `SseMessage` | newline |

### Binary / Media
| type | data | framing | mime auto-detected |
|------|------|---------|-------------------|
| `binary` | `Uint8Array` | length-prefix | yes |
| `image` | `Uint8Array` | length-prefix | yes |
| `video` | `Uint8Array` | length-prefix | yes |
| `audio` | `Uint8Array` | length-prefix | yes |
| `pdf` | `Uint8Array` | length-prefix | yes |
| `archive` | `Uint8Array` | length-prefix | yes |
| `protobuf` | `Uint8Array` | length-prefix | yes |
| `msgpack` | `Uint8Array` | length-prefix | yes |
| `cbor` | `Uint8Array` | length-prefix | yes |
| `arrow` | `Uint8Array` | length-prefix | yes |
| `parquet` | `Uint8Array` | length-prefix | yes |
| `frame` | `FrameData` | length-prefix | — |
| `multipart` | `MultipartData` | length-prefix | yes |
| `embedding` | `Float32Array` | length-prefix | — |

### Scalars
| type | data | framing |
|------|------|---------|
| `uint8` | `number` | length-prefix (1B) |
| `int32` | `number` | length-prefix (4B) |
| `float64` | `number` | length-prefix (8B) |
| `bool` | `boolean` | length-prefix (1B) |
| `timestamp` | `number` | length-prefix (8B) |
| `null` | `null` | length-prefix (0B) |

Binary decode populates `meta.mime` automatically via magic-byte detection (35 formats).

## API

### `createProcessor(config)`

```ts
createProcessor<I, O>({
  name: string,
  input?: AsyncIterable<Chunk> | ReadableStream<Chunk> | null,  // null = stdin
  transform: (flow: sflow<I>) => sflow<O>,
  output?: WritableStream<Chunk> | null,  // null = stdout
})
```

Returns `ProcessorHandle` with `.pipe(next)`, `.start()`, `.stop()`, `.output`.

### `pipe(...nodes)`

Compose `StreamNode`s: `pipe(a, b, c)` = `a → b → c`.

### `stdioProcessor(config)`

Wraps a processor to read stdin / write stdout. Framing auto-selected by `inputType`.

### `acpProcessor(conn, name, transform)`

Wraps an ACP `AgentSideConnection` as source and sink.

### `detectMime(data: Uint8Array): string`

Magic-byte detection for 35 formats. Returns MIME type string or `application/octet-stream`.

### `registry.snapshot()`

Returns all live processor states: `name`, `status`, `chunksIn`, `chunksOut`, `errors`, `uptimeMs`.

## Shell piping

Processors behave like CLI programs:

```sh
node proc-a.js | node proc-b.js | node proc-c.js
```

Framing is transparent to transform functions — ndjson for structured types, length-prefix for binary, newline for text.
