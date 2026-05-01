import { registry } from "./registry.js";

export type Severity = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  ts: number;
  subsystem: string;
  severity: Severity;
  message: string;
  data?: Record<string, unknown>;
};

const RING_SIZE = 200;
const ring: LogEntry[] = [];
let head = 0;
let logSink: ((e: LogEntry) => void) | null = null;

export function setLogSink(fn: ((e: LogEntry) => void) | null): void {
  logSink = fn;
}

export function log(subsystem: string, severity: Severity, message: string, data?: Record<string, unknown>): void {
  const entry: LogEntry = data !== undefined
    ? { ts: Date.now(), subsystem, severity, message, data }
    : { ts: Date.now(), subsystem, severity, message };
  ring[head % RING_SIZE] = entry;
  head++;
  logSink?.(entry);
}

export function logs(): LogEntry[] {
  if (head <= RING_SIZE) return ring.slice(0, head);
  const start = head % RING_SIZE;
  return ring.slice(start).concat(ring.slice(0, start));
}

export function clearLogs(): void {
  ring.length = 0;
  head = 0;
}

export type DebugSnapshot = {
  ts: number;
  processors: object[];
  recentLogs: LogEntry[];
  totals: { processors: number; logs: number };
};

export function snapshot(): DebugSnapshot {
  const processors = registry.snapshot();
  const recent = logs().slice(-20);
  return {
    ts: Date.now(),
    processors,
    recentLogs: recent,
    totals: { processors: processors.length, logs: head },
  };
}

export function inspect(name?: string): object | null {
  const all = registry.inspect();
  if (name === undefined) return all;
  const found = all.find(p => p.name === name);
  if (!found) return null;
  return {
    name: found.name,
    status: found.status,
    chunksIn: found.chunksIn,
    chunksOut: found.chunksOut,
    errors: found.errors.slice(-10),
    uptimeMs: found.uptimeMs(),
  };
}
