import type { Chunk } from "./chunk.js";
import type { ErrorChunk, SignalChunk } from "./chunk-aliases.js";

const STDERR_TYPES = new Set(["error", "signal"]);

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

export function splitStream<O extends Chunk>(iter: AsyncIterable<O>): StreamSplit<O> {
  const stdoutQueue: O[] = [];
  const stderrQueue: (ErrorChunk | SignalChunk)[] = [];
  const stdoutWake: { v: Wake } = { v: null };
  const stderrWake: { v: Wake } = { v: null };
  let done = false;

  (async () => {
    for await (const chunk of iter) {
      if (STDERR_TYPES.has(chunk.type)) {
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
    while (true) {
      if (queue.length > 0) { yield queue.shift()!; }
      else if (done) { return; }
      else { await new Promise<void>(r => { wake.v = r; }); }
    }
  }

  return {
    stdout: drain(stdoutQueue, stdoutWake),
    stderr: drain(stderrQueue, stderrWake),
  };
}
