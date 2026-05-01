# floosie — Agent Notes

## Technical Caveats

### xstate Removed in v0.7.0

ProcessorMachine (xstate-based state machine from v0.6.x) was removed. Replaced with a 50-line dispatch-table actor in `src/machine.ts`. Rationale: per-chunk lifecycle events (`send()`) were already routed around xstate to plain object counters; the 4-state lifecycle (idle/running/error/stopped) was not complex enough to justify ~50KB of runtime. New API: `createProcessorActor(name)` returns `{status, context, send, stop}`. **Breaking change** — ProcessorMachine symbol no longer exported.

**Application**: Code importing `ProcessorMachine` from floosie must switch to `createProcessorActor`. The lifecycle is simpler but the `.send()` behavior and context reading remain compatible.

### Text Codec Newline Framing

`encodeChunk(text("hi"))` produces `"hi\n"` not `"hi"` — the text codec appends a newline as framing. Tests round-tripping text chunks via encode/decode must `.trim()` the decoded result or compare to the newline-suffixed value. Discovered during v0.7.0 implementation via test failure.

**Application**: When writing tests or pipelines that call `encodeChunk()` on a text chunk, account for the trailing newline in assertions.

### Debug Surface Naming (v0.7.0)

The new debug module (`src/debug.ts`) exports `debugLog`, `debugLogs`, `debugSnapshot`, `debugInspect`, `setLogSink`, `clearLogs`. These names **do not** use `log` (lowercase) because `log` is already a chunk factory in the Chunk discriminated union. Policy mandates per-subsystem observability; the public API avoids this collision.

**Application**: When adding observability hooks, call `debugLog(subsystem, severity, message, data?)` and verify with `debugSnapshot()`. Never name observability functions `log` — that name is reserved for the chunk factory.

## Learning Audit

2026-05-01: checked 2 items (text codec, debug naming); 0 recall hits; ingested 3 facts (xstate x2, text codec, debug). All retained — v0.7.0 material still recent.
