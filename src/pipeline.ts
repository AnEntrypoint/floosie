import type { Chunk } from "./chunk-types.js";
import type { StreamNode } from "./node.js";
import { createNode } from "./node.js";
import { sflow } from "sflow";

export function pipe(...nodes: []): never;
export function pipe<A extends Chunk, B extends Chunk>(a: StreamNode<A, B>): StreamNode<A, B>;
export function pipe<A extends Chunk, B extends Chunk, C extends Chunk>(
  a: StreamNode<A, B>,
  b: StreamNode<B, C>,
): StreamNode<A, C>;
export function pipe<A extends Chunk, B extends Chunk, C extends Chunk, D extends Chunk>(
  a: StreamNode<A, B>,
  b: StreamNode<B, C>,
  c: StreamNode<C, D>,
): StreamNode<A, D>;
export function pipe<A extends Chunk, B extends Chunk, C extends Chunk, D extends Chunk, E extends Chunk>(
  a: StreamNode<A, B>,
  b: StreamNode<B, C>,
  c: StreamNode<C, D>,
  d: StreamNode<D, E>,
): StreamNode<A, E>;
export function pipe(...nodes: StreamNode[]): StreamNode {
  if (nodes.length === 0) throw new Error("pipe() requires at least one node");
  return nodes.reduce((acc, next) => acc.pipe(next));
}

export function connect<I extends Chunk, O extends Chunk>(
  from: StreamNode<I, O>,
  to: { run(source: AsyncIterable<O>): AsyncIterable<unknown> },
): AsyncIterable<unknown> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<unknown> {
      const source = from.run(emptySource<I>());
      return to.run(source as AsyncIterable<O>)[Symbol.asyncIterator]();
    },
  };
}

async function* emptySource<T>(): AsyncIterable<T> {}

export function source<T extends Chunk>(items: Iterable<T> | AsyncIterable<T>): StreamNode<never, T> {
  return createNode<never, T>("source", (_flow) => sflow(items as AsyncIterable<T>));
}

export function sink<T extends Chunk>(name: string): StreamNode<T, T> {
  return createNode<T, T>(name, (flow) => flow);
}
