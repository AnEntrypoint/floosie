export type ProcessorStatus = "idle" | "running" | "error" | "stopped";

export type ProcessorContext = {
  name: string;
  errors: string[];
  startedAt: number | null;
};

export type ProcessorEvent =
  | { type: "START" }
  | { type: "START_AT"; ts: number }
  | { type: "STOP" }
  | { type: "ERROR"; message: string }
  | { type: "COMPLETE" }
  | { type: "RESET" };

// STOP is accepted from idle so an intent to stop before anything started is
// not silently discarded, and START is accepted from stopped so a stopped
// processor can be restarted rather than becoming permanently inert while its
// handle still exposes start(). ERROR self-transitions so a second failure is
// still an observed failure.
const TRANSITIONS: Record<ProcessorStatus, Partial<Record<ProcessorEvent["type"], ProcessorStatus>>> = {
  idle:    { START: "running", STOP: "stopped" },
  running: { STOP: "stopped", ERROR: "error", COMPLETE: "idle" },
  error:   { RESET: "idle", STOP: "stopped", ERROR: "error", START: "running" },
  stopped: { START: "running", RESET: "idle" },
};

export type ProcessorActor = {
  status: ProcessorStatus;
  context: ProcessorContext;
  send(event: ProcessorEvent): void;
  stop(): void;
};

export function createProcessorActor(name: string): ProcessorActor {
  const actor: ProcessorActor = {
    status: "idle",
    context: { name, errors: [], startedAt: null },
    send(event) {
      if (event.type === "START_AT") { actor.context.startedAt = event.ts; return; }
      // Recorded before the transition is consulted: a failure that arrives in
      // a state with nowhere to go is still a failure that happened, and
      // dropping its message leaves `errors` reporting only the first one.
      if (event.type === "ERROR") actor.context.errors.push(event.message);
      const next = TRANSITIONS[actor.status][event.type];
      if (!next) return;
      if (event.type === "COMPLETE") actor.context.startedAt = null;
      actor.status = next;
    },
    stop() { actor.send({ type: "STOP" }); },
  };
  return actor;
}
