import { createProcessorActor, type ProcessorActor, type ProcessorEvent, type ProcessorStatus } from "./machine.js";
import { log } from "./debug.js";

export type { ProcessorStatus };

export type ProcessorState = {
  readonly name: string;
  readonly status: ProcessorStatus;
  readonly chunksIn: number;
  readonly chunksOut: number;
  readonly errors: string[];
  readonly startedAt: number | null;
  uptimeMs(): number;
  send(event: ProcessorEvent): void;
  incIn(): void;
  incOut(): void;
};

type Entry = { actor: ProcessorActor; counters: { in: number; out: number } };
const entries = new Map<string, Entry>();
let nameCounter = 0;

function uniqueName(base: string): string {
  return entries.has(base) ? `${base}-${++nameCounter}` : base;
}

function stateView(actor: ProcessorActor, counters: { in: number; out: number }): ProcessorState {
  return {
    get name()      { return actor.context.name; },
    get status()    { return actor.status; },
    get chunksIn()  { return counters.in; },
    get chunksOut() { return counters.out; },
    get errors()    { return actor.context.errors; },
    get startedAt() { return actor.context.startedAt; },
    uptimeMs()      { const s = actor.context.startedAt; return s == null ? 0 : Date.now() - s; },
    send(event)     {
      const before = actor.status;
      actor.send(event);
      if (actor.status !== before) log("registry", event.type === "ERROR" ? "error" : "info", `${actor.context.name}: ${before} -> ${actor.status}`);
    },
    incIn()         { counters.in++; },
    incOut()        { counters.out++; },
  };
}

export const registry = {
  register(name: string): ProcessorState {
    const key = uniqueName(name);
    const actor = createProcessorActor(key);
    const counters = { in: 0, out: 0 };
    entries.set(key, { actor, counters });
    return stateView(actor, counters);
  },

  deregister(name: string): void {
    entries.get(name)?.actor.stop();
    entries.delete(name);
  },

  inspect(): ProcessorState[] {
    return [...entries.values()].map(e => stateView(e.actor, e.counters));
  },

  snapshot(): object[] {
    return [...entries.values()].map(e => ({
      name: e.actor.context.name,
      status: e.actor.status,
      chunksIn: e.counters.in,
      chunksOut: e.counters.out,
      errors: e.actor.context.errors.slice(-10),
      uptimeMs: e.actor.context.startedAt == null ? 0 : Date.now() - e.actor.context.startedAt,
    }));
  },
};
