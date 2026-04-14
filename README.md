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

## Chunk types

| type | data | framing (stdio) |
|------|------|-----------------|
| `json` | any JSON value | ndjson (newline-delimited) |
| `text` | string | newline |
| `binary` | Uint8Array | 4-byte length prefix |
| `image` | Uint8Array | 4-byte length prefix |
| `video` | Uint8Array | 4-byte length prefix |
| `raw` | unknown | ndjson |

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

### `registry.snapshot()`

Returns all live processor states: `name`, `status`, `chunksIn`, `chunksOut`, `errors`, `uptimeMs`.

## Shell piping

Processors behave like CLI programs:

```sh
node proc-a.js | node proc-b.js | node proc-c.js
```

JSON chunks use ndjson, binary uses length-prefix framing — the framing is transparent to the transform function.
