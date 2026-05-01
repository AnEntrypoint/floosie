import { sflow } from "sflow";
import type { Chunk } from "./chunk-types.js";

export type FlowFn<I extends Chunk, O extends Chunk> = (flow: ReturnType<typeof sflow<I>>) => ReturnType<typeof sflow<O>>;

export type StreamNode<I extends Chunk = Chunk, O extends Chunk = Chunk> = {
  readonly name: string;
  readonly transform: FlowFn<I, O>;
  pipe<N extends Chunk>(next: StreamNode<O, N>): StreamNode<I, N>;
  run(source: AsyncIterable<I>): AsyncIterable<O>;
};

function makeNode<I extends Chunk, O extends Chunk>(
  name: string,
  transform: FlowFn<I, O>,
): StreamNode<I, O> {
  const node: StreamNode<I, O> = {
    name,
    transform,
    pipe<N extends Chunk>(next: StreamNode<O, N>): StreamNode<I, N> {
      return makeNode<I, N>(
        `${name}→${next.name}`,
        (flow) => next.transform(transform(flow)),
      );
    },
    run(source: AsyncIterable<I>): AsyncIterable<O> {
      return transform(sflow(source));
    },
  };
  return node;
}

export function createNode<I extends Chunk, O extends Chunk>(
  name: string,
  transform: FlowFn<I, O>,
): StreamNode<I, O> {
  return makeNode(name, transform);
}

export function identityNode<T extends Chunk>(name: string): StreamNode<T, T> {
  return makeNode(name, (flow) => flow);
}
