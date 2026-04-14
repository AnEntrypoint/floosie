import { createActor, type Actor } from "xstate";
import { ProcessorMachine, type ProcessorContext, type ProcessorStatus } from "./machine.js";

export type { ProcessorStatus };

export type ProcessorState = {
  readonly name: string;
  readonly status: ProcessorStatus;
  readonly chunksIn: number;
  readonly chunksOut: number;
  readonly errors: string[];
  readonly startedAt: number | null;
  uptimeMs(): number;
  send(event: Parameters<Actor<typeof ProcessorMachine>["send"]>[0]): void;
  incIn(): void;
  incOut(): void;
};

type Entry = { actor: Actor<typeof ProcessorMachine>; counters: { in: number; out: number } };
const entries = new Map<string, Entry>();
let nameCounter = 0;

function uniqueName(base: string): string {
  return entries.has(base) ? `${base}-${++nameCounter}` : base;
}

function ctx(actor: Actor<typeof ProcessorMachine>): ProcessorContext {
  return actor.getSnapshot().context as unknown as ProcessorContext;
}

function stateView(actor: Actor<typeof ProcessorMachine>, counters: { in: number; out: number }): ProcessorState {
  return {
    get name()      { return ctx(actor).name; },
    get status()    { return actor.getSnapshot().value as ProcessorStatus; },
    get chunksIn()  { return counters.in; },
    get chunksOut() { return counters.out; },
    get errors()    { return ctx(actor).errors; },
    get startedAt() { return ctx(actor).startedAt; },
    uptimeMs()      { const s = ctx(actor).startedAt; return s == null ? 0 : Date.now() - s; },
    send(event)     { actor.send(event as any); },
    incIn()         { counters.in++; },
    incOut()        { counters.out++; },
  };
}

export const registry = {
  register(name: string): ProcessorState {
    const key = uniqueName(name);
    const actor = createActor(ProcessorMachine, { input: { name: key } });
    actor.start();
    const counters = { in: 0, out: 0 };
    entries.set(key, { actor, counters });
    return stateView(actor, counters);
  },

  deregister(name: string): void {
    const entry = entries.get(name);
    entry?.actor.stop();
    entries.delete(name);
  },

  inspect(): ProcessorState[] {
    return [...entries.values()].map(e => stateView(e.actor, e.counters));
  },

  snapshot(): object[] {
    return [...entries.values()].map(e => {
      const c = ctx(e.actor);
      return {
        name: c.name,
        status: e.actor.getSnapshot().value,
        chunksIn: e.counters.in,
        chunksOut: e.counters.out,
        errors: c.errors.slice(-10),
        uptimeMs: c.startedAt == null ? 0 : Date.now() - c.startedAt,
      };
    });
  },
};
