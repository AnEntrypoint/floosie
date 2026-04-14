import { sflow } from "sflow";
import type { Chunk } from "./chunk.js";
import { createNode, type StreamNode } from "./node.js";

export function mux<T extends Chunk>(...sources: AsyncIterable<T>[]): StreamNode<never, T> {
  return createNode("mux", (_flow) =>
    sources.slice(1).reduce<ReturnType<typeof sflow<T>>>(
      (acc, s) => acc.merge(sflow(s)),
      sflow(sources[0]!),
    )
  );
}

export function split<T extends Chunk>(flow: ReturnType<typeof sflow<T>>, n: number): ReturnType<typeof sflow<T>>[] {
  const branches: ReturnType<typeof sflow<T>>[] = [];
  let s = flow;
  for (let i = 0; i < n - 1; i++) {
    const [a, b] = s.tee();
    branches.push(sflow(a) as ReturnType<typeof sflow<T>>);
    s = sflow(b) as ReturnType<typeof sflow<T>>;
  }
  branches.push(s);
  return branches;
}

export function gate<T extends Chunk>(pred: (v: T) => Promise<boolean> | boolean): StreamNode<T, T> {
  return createNode("gate", (flow) =>
    flow.through(async function*(src) {
      for await (const v of src) if (await pred(v)) yield v;
    })
  );
}

export function scan<T extends Chunk>(fn: (acc: unknown, v: T) => unknown, seed: unknown): StreamNode<T, T> {
  return createNode("scan", (flow) =>
    flow.through(async function*(src) {
      let acc = seed;
      for await (const v of src) { acc = fn(acc, v); yield acc as T; }
    })
  );
}

export function zip<T extends Chunk>(...sources: AsyncIterable<T>[]): StreamNode<T, T> {
  return createNode("zip", (_flow) =>
    sflow(async function*() {
      const iters = sources.map((s) => s[Symbol.asyncIterator]());
      while (true) {
        const nexts = await Promise.all(iters.map((it) => it.next()));
        if (nexts.some((n) => n.done)) break;
        yield nexts.map((n) => n.value) as unknown as T;
      }
    }())
  );
}

export function withBackpressure<T extends Chunk>(hwm: number): StreamNode<T, T> {
  return createNode("backpressure", (flow) =>
    flow.through(async function*(src) {
      let count = 0;
      for await (const v of src) {
        count++;
        if (count > hwm) await new Promise<void>((r) => setImmediate(r));
        yield v;
      }
    })
  );
}

export function batch<T extends Chunk>(n: number): StreamNode<T, T> {
  return createNode("batch", (flow) =>
    (flow as ReturnType<typeof sflow<unknown>>).chunk(n) as unknown as ReturnType<typeof sflow<T>>
  );
}

export function window<T extends Chunk>(ms: number): StreamNode<T, T> {
  return createNode("window", (flow) =>
    (flow as ReturnType<typeof sflow<unknown>>).chunkInterval(ms) as unknown as ReturnType<typeof sflow<T>>
  );
}

export function throttle<T extends Chunk>(ms: number): StreamNode<T, T> {
  return createNode("throttle", (flow) => flow.throttle(ms));
}

export function debounce<T extends Chunk>(ms: number): StreamNode<T, T> {
  return createNode("debounce", (flow) => flow.debounce(ms));
}

export function take<T extends Chunk>(n: number): StreamNode<T, T> {
  return createNode("take", (flow) => flow.limit(n));
}

export function drop<T extends Chunk>(n: number): StreamNode<T, T> {
  return createNode("drop", (flow) => flow.skip(n));
}

export function distinct<T extends Chunk>(keyFn?: (v: T) => unknown): StreamNode<T, T> {
  return createNode("distinct", (flow) => keyFn ? flow.uniqBy(keyFn) : flow.uniq());
}

export function parallel<T extends Chunk, O extends Chunk>(fn: (v: T) => Promise<O>, concurrency: number): StreamNode<T, O> {
  return createNode("parallel", (flow) =>
    (flow as ReturnType<typeof sflow<unknown>>).pMap(fn as (v: unknown) => Promise<O>, { concurrency }) as ReturnType<typeof sflow<O>>
  );
}
