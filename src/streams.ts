import type { Chunk } from "./chunk-types.js";
import type { ErrorChunk, SignalChunk } from "./chunk-aliases.js";

export type StreamSplit<O extends Chunk> = {
  stdout: AsyncIterable<O>;
  stderr: AsyncIterable<ErrorChunk | SignalChunk>;
  /** Stops pumping the source and ends both halves. Idempotent. */
  cancel(): void;
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
  let failure: { err: unknown } | null = null;
  let cancelled = false;

  const finish = (err?: unknown): void => {
    if (err !== undefined) failure = { err };
    done = true;
    notify(stdoutWake);
    notify(stderrWake);
  };

  // A source that throws has to reach whoever is reading the split. Left
  // unhandled it did two bad things at once: both halves waited forever for a
  // `done` that would never be set, and the rejection escaped this promise to
  // the process, where Node's default handling terminates it -- so a library
  // consumer could neither catch the failure nor survive it. createAsyncQueue,
  // in this same file, already gets this right; this now matches it.
  void (async () => {
    try {
      for await (const chunk of iter) {
        if (cancelled) break;
        if (onOut) onOut();
        if (chunk.type === "error" || chunk.type === "signal") {
          stderrQueue.push(chunk as unknown as ErrorChunk | SignalChunk);
          notify(stderrWake);
        } else {
          stdoutQueue.push(chunk);
          notify(stdoutWake);
        }
      }
      finish();
    } catch (err) {
      finish(err);
    }
  })();

  // Chunks already read are delivered before the failure surfaces: they really
  // did arrive, and discarding them would lose the output that explains how far
  // the source got.
  async function* drain<T>(queue: T[], wake: { v: Wake }): AsyncIterable<T> {
    let idx = 0;
    while (true) {
      if (idx < queue.length) {
        yield queue[idx++]!;
      } else if (done) {
        if (failure) throw failure.err;
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
    cancel() {
      if (cancelled) return;
      cancelled = true;
      finish();
    },
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
