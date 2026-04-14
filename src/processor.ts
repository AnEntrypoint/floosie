import { sflow } from "sflow";
import type { Chunk } from "./chunk.js";
import type { ErrorChunk, SignalChunk } from "./chunk-aliases.js";
import type { FlowFn } from "./node.js";
import { registry, type ProcessorState } from "./registry.js";
import { splitStream, type StreamSplit } from "./streams.js";
import type { Writable } from "node:stream";

type AnyReadable = AsyncIterable<Chunk> | ReadableStream<Chunk> | null;
type AnyWritable = WritableStream<Chunk> | Writable | null | undefined;

export type ProcessorConfig<I extends Chunk, O extends Chunk> = {
  name: string;
  input?: AnyReadable;
  transform: FlowFn<I, O>;
  output?: AnyWritable;
};

export type ProcessorHandle<I extends Chunk = Chunk, O extends Chunk = Chunk> = {
  readonly name: string;
  readonly state: ProcessorState;
  readonly _transform: FlowFn<I, O>;
  start(): Promise<void>;
  stop(): void;
  pipe<N extends Chunk>(next: ProcessorHandle<O, N>): ProcessorHandle<I, N>;
  readonly output: AsyncIterable<O>;
  readonly stdout: AsyncIterable<O>;
  readonly stderr: AsyncIterable<ErrorChunk | SignalChunk>;
};

function toAsyncIterable(source: AnyReadable): AsyncIterable<Chunk> {
  if (source == null) return stdinIter();
  if (Symbol.asyncIterator in (source as object)) return source as AsyncIterable<Chunk>;
  return webReadable(source as ReadableStream<Chunk>);
}

async function* stdinIter(): AsyncIterable<Chunk> {
  for await (const chunk of process.stdin as AsyncIterable<unknown>) yield chunk as Chunk;
}

async function* webReadable(readable: ReadableStream<Chunk>): AsyncIterable<Chunk> {
  const reader = readable.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield value;
    }
  } finally { reader.releaseLock(); }
}

async function drainToWritable(iter: AsyncIterable<Chunk>, dest: AnyWritable): Promise<void> {
  if (dest == null) {
    const enc = new TextEncoder();
    for await (const chunk of iter) process.stdout.write(enc.encode(JSON.stringify(chunk) + "\n"));
    return;
  }
  if (dest instanceof WritableStream) {
    const writer = (dest as WritableStream<Chunk>).getWriter();
    try { for await (const chunk of iter) await writer.write(chunk); await writer.close(); }
    finally { writer.releaseLock(); }
    return;
  }
  const w = dest as InstanceType<typeof Writable>;
  for await (const chunk of iter) await new Promise<void>((res, rej) => w.write(chunk, e => e ? rej(e) : res()));
  await new Promise<void>(res => w.end(res));
}

export function createProcessor<I extends Chunk, O extends Chunk>(
  config: ProcessorConfig<I, O>,
): ProcessorHandle<I, O> {
  const state = registry.register(config.name);
  let split: StreamSplit<O> | null = null;

  function buildSplit(): StreamSplit<O> {
    const sourceRaw = toAsyncIterable(config.input ?? null);
    const source = trackInput(sourceRaw, state);
    const flow = sflow(source as AsyncIterable<I>);
    const transformed = config.transform(flow) as AsyncIterable<O>;
    const tracked = trackOutput(transformed, state);
    return splitStream(tracked);
  }

  const handle: ProcessorHandle<I, O> = {
    name: state.name,
    state,
    _transform: config.transform,

    get output()  { if (!split) split = buildSplit(); return split.stdout; },
    get stdout()  { if (!split) split = buildSplit(); return split.stdout; },
    get stderr()  { if (!split) split = buildSplit(); return split.stderr; },

    async start(): Promise<void> {
      if (state.status === "running") return;
      state.send({ type: "START" });
      state.send({ type: "START_AT", ts: Date.now() });
      split = buildSplit();
      try {
        await drainToWritable(split.stdout as AsyncIterable<Chunk>, config.output);
        state.send({ type: "COMPLETE" });
      } catch (e) {
        state.send({ type: "ERROR", message: String(e) });
        throw e;
      }
    },

    stop(): void {
      state.send({ type: "STOP" });
      split = null;
    },

    pipe<N extends Chunk>(next: ProcessorHandle<O, N>): ProcessorHandle<I, N> {
      const composedTransform: FlowFn<I, N> = (flow) =>
        next._transform(handle._transform(flow) as ReturnType<typeof sflow<O>>);
      const pipedConfig: ProcessorConfig<I, N> = {
        name: `${state.name}→${next.name}`,
        transform: composedTransform,
      };
      if (config.input !== undefined) pipedConfig.input = config.input;
      if (config.output !== undefined) pipedConfig.output = config.output;
      return createProcessor<I, N>(pipedConfig);
    },
  };

  return handle;
}

async function* trackInput(source: AsyncIterable<Chunk>, state: ProcessorState): AsyncIterable<Chunk> {
  for await (const chunk of source) { state.send({ type: "TICK_IN" }); yield chunk; }
}

async function* trackOutput<O extends Chunk>(source: AsyncIterable<O>, state: ProcessorState): AsyncIterable<O> {
  for await (const chunk of source) { state.send({ type: "TICK_OUT" }); yield chunk; }
}
