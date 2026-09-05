# floosie — Agent Notes

## Technical Caveats

### xstate Removed in v0.7.0

ProcessorMachine (xstate-based state machine from v0.6.x) was removed. Replaced with a 50-line dispatch-table actor in `src/machine.ts`. Rationale: per-chunk lifecycle events (`send()`) were already routed around xstate to plain object counters; the 4-state lifecycle (idle/running/error/stopped) was not complex enough to justify ~50KB of runtime. New API: `createProcessorActor(name)` returns `{status, context, send, stop}`. **Breaking change** — ProcessorMachine symbol no longer exported.

**Application**: Code importing `ProcessorMachine` from floosie must switch to `createProcessorActor`. The lifecycle is simpler but the `.send()` behavior and context reading remain compatible.

### splitStream Propagates Source Failures (and only it does)

`splitStream`'s internal pump previously ran as a bare `(async () => {...})()` with
no `try`. A source that threw produced two failures at once: `done` was never
set, so both `stdout` and `stderr` waited forever for a completion that would
never come; and the rejection escaped to the process, where Node's default
handling terminates it. A consumer could neither catch the failure nor survive
it — `createProcessor.start()`'s own `try/catch` was bypassed entirely and the
host process died. Measured before the fix: both halves hung, `start()` never
settled, and the process exited on the unhandled rejection.

The pump now catches, records the error, and every drain rethrows it *after*
delivering the chunks that really did arrive. `createAsyncQueue`, in the same
file, already had this contract; the two now match.

**Application**: any queue-and-wake pump added here must have a failure path
that reaches its consumers. A `for await` inside a detached async IIFE with no
`catch` is a process-killer, not a background task. And `StreamSplit.cancel()`
exists because dropping the reference to a split does not stop its pump — a
stopped processor kept reading its input for as long as the input had chunks.

### The Lifecycle Machine Must Not Lose What It Observed

Two defects came from the same shape — deriving an observation from a state
transition rather than recording it. The error message was pushed only when the
transition was legal, so `error` having no `ERROR` entry meant the second and
every later failure was silently discarded from `context.errors`, a plural array
whose whole purpose is to accumulate. And `idle` had no `STOP` entry, so
`stop()` before `start()` was a no-op that left the status reading `idle` — an
intent to stop, dropped without a trace.

`ERROR` now records its message before the transition table is consulted; `idle`
accepts `STOP`; `error` self-transitions on `ERROR`; and `stopped` accepts
`START`/`RESET` so a stopped processor is restartable rather than inert while
its handle still exposes `start()`. Before the fix, `start()` on a stopped
processor ran the pipeline to completion while `status` still read `stopped`.

**Application**: record the observation first, then transition. A status field
that cannot distinguish "never started" from "stopped" from "finished" is
reporting less than it knows.

### zip Ends at Its Shortest Source, So It Must Close the Others

`zip` breaks as soon as any iterator reports `done`, which leaves every longer
source suspended mid-iteration with its `finally` block unreached — whatever it
holds open (a file handle, a socket, a subprocess) stays open for the life of
the process. Witnessed: a 3-item source zipped against a 1-item source never
ran its cleanup. Now `finally` calls `.return()` on all iterators.

**Application**: any operator that stops consuming a source before it is
exhausted owns closing it.

### Text Codec Newline Framing

`encodeChunk(text("hi"))` produces `"hi\n"` not `"hi"` — the text codec appends a newline as framing. Tests round-tripping text chunks via encode/decode must `.trim()` the decoded result or compare to the newline-suffixed value. Discovered during v0.7.0 implementation via test failure.

**Application**: When writing tests or pipelines that call `encodeChunk()` on a text chunk, account for the trailing newline in assertions.

### Debug Surface Naming (v0.7.0)

The new debug module (`src/debug.ts`) exports `debugLog`, `debugLogs`, `debugSnapshot`, `debugInspect`, `setLogSink`, `clearLogs`. These names **do not** use `log` (lowercase) because `log` is already a chunk factory in the Chunk discriminated union. Policy mandates per-subsystem observability; the public API avoids this collision.

**Application**: When adding observability hooks, call `debugLog(subsystem, severity, message, data?)` and verify with `debugSnapshot()`. Never name observability functions `log` — that name is reserved for the chunk factory.

## Learning Audit

2026-05-01: checked 2 items (text codec, debug naming); 0 recall hits; ingested 3 facts (xstate x2, text codec, debug). All retained — v0.7.0 material still recent.
