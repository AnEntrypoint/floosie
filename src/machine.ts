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

const TRANSITIONS: Record<ProcessorStatus, Partial<Record<ProcessorEvent["type"], ProcessorStatus>>> = {
  idle:    { START: "running" },
  running: { STOP: "stopped", ERROR: "error", COMPLETE: "idle" },
  error:   { RESET: "idle", STOP: "stopped" },
  stopped: {},
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
      const next = TRANSITIONS[actor.status][event.type];
      if (!next) return;
      if (event.type === "ERROR") actor.context.errors.push(event.message);
      if (event.type === "COMPLETE") actor.context.startedAt = null;
      actor.status = next;
    },
    stop() { actor.status = "stopped"; },
  };
  return actor;
}
