import type { Chunk } from "./chunk-types.js";
import type { ErrorChunk, SignalChunk } from "./chunk-aliases.js";

export type StreamSplit<O extends Chunk> = {
  stdout: AsyncIterable<O>;
  stderr: AsyncIterable<ErrorChunk | SignalChunk>;
};

type Wake = (() => void) | null;

function notify(ref: { v: Wake }): void {
  const fn = ref.v;
  ref.v = null;
  if (fn) fn();
}

export function splitStream<O extends Chunk>(
  iter: AsyncIterable<O>,
  onOut?: () => void,
): StreamSplit<O> {
  const stdoutQueue: O[] = [];
  const stderrQueue: (ErrorChunk | SignalChunk)[] = [];
  const stdoutWake: { v: Wake } = { v: null };
  const stderrWake: { v: Wake } = { v: null };
  let done = false;

  (async () => {
    for await (const chunk of iter) {
      if (onOut) onOut();
      if (chunk.type === "error" || chunk.type === "signal") {
        stderrQueue.push(chunk as unknown as ErrorChunk | SignalChunk);
        notify(stderrWake);
      } else {
        stdoutQueue.push(chunk);
        notify(stdoutWake);
      }
    }
    done = true;
    notify(stdoutWake);
    notify(stderrWake);
  })();

  async function* drain<T>(queue: T[], wake: { v: Wake }): AsyncIterable<T> {
    let idx = 0;
    while (true) {
      if (idx < queue.length) {
        yield queue[idx++]!;
      } else if (done) {
        return;
      } else {
        if (idx > 0) { queue.splice(0, idx); idx = 0; }
        await new Promise<void>(r => { wake.v = r; });
      }
    }
  }

  return {
    stdout: drain(stdoutQueue, stdoutWake),
    stderr: drain(stderrQueue, stderrWake),
  };
}

export type AsyncQueue<T> = {
  push(v: T): void;
  finish(err?: unknown): void;
  iter(): AsyncIterable<T>;
};

export function createAsyncQueue<T>(): AsyncQueue<T> {
  const queue: T[] = [];
  const waiters: Array<(v: IteratorResult<T>) => void> = [];
  let closed = false;
  let error: unknown = null;
  return {
    push(v) {
      const w = waiters.shift();
      if (w) w({ value: v, done: false }); else queue.push(v);
    },
    finish(err) {
      if (err !== undefined) error = err;
      closed = true;
      for (const w of waiters.splice(0)) w({ value: undefined as unknown as T, done: true });
    },
    async *iter() {
      while (!closed || queue.length) {
        if (queue.length) { yield queue.shift()!; continue; }
        const next = await new Promise<IteratorResult<T>>(r => waiters.push(r));
        if (next.done) break;
        yield next.value;
      }
      if (error) throw error;
    },
  };
}
