import { createMachine, assign } from "xstate";

export type ProcessorStatus = "idle" | "running" | "error" | "stopped";

export type ProcessorContext = {
  name: string;
  chunksIn: number;
  chunksOut: number;
  errors: string[];
  startedAt: number | null;
};

export const ProcessorMachine = createMachine({
  id: "processor",
  initial: "idle" as ProcessorStatus,
  context: ({ input }: { input: { name: string } }): ProcessorContext => ({
    name: input.name,
    chunksIn: 0,
    chunksOut: 0,
    errors: [],
    startedAt: null,
  }),
  states: {
    idle: { on: { START: "running" } },
    running: {
      on: {
        STOP:     "stopped",
        ERROR:    { target: "error",   actions: assign({ errors:    ({ context, event }: any) => [...context.errors, (event as any).message] }) },
        COMPLETE: { target: "idle",    actions: assign({ startedAt: () => null }) },
        TICK_IN:  { actions: assign({ chunksIn:  ({ context }: any) => context.chunksIn  + 1 }) },
        TICK_OUT: { actions: assign({ chunksOut: ({ context }: any) => context.chunksOut + 1 }) },
        START_AT: { actions: assign({ startedAt: ({ event }: any) => (event as any).ts }) },
      },
    },
    error:   { on: { RESET: "idle", STOP: "stopped" } },
    stopped: { type: "final" },
  },
});
