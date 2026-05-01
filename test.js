import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";

const m = await import("./dist/index.js");

const groups = [];
const group = (name, fn) => groups.push({ name, fn });

group("chunks+codecs+mime", async () => {
  const j = m.json({ a: 1 });
  assert.equal(j.type, "json");
  const enc = m.encodeChunk(j);
  const dec = m.decodeChunk("json", enc);
  assert.deepEqual(dec.data, { a: 1 });

  const t = m.text("hi");
  assert.equal(new TextDecoder().decode(m.encodeChunk(t)).trim(), "hi");

  assert.equal(m.detectMime(new Uint8Array([0x89,0x50,0x4e,0x47])), "image/png");
  assert.equal(m.detectMime(new Uint8Array([0x1f,0x8b])), "application/gzip");
  assert.equal(m.detectMime(new TextEncoder().encode("{\"x\":1}")), "application/json");
  assert.equal(m.mimeToChunkType("image/png"), "image");
  assert.equal(m.mimeToChunkType("application/json"), "json");
  assert.equal(m.mimeToChunkType("application/x-totally-unknown"), "binary");

  const png = new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a, 0,0,0,0]);
  const info = await m.detectFile(png);
  assert.equal(info.mime, "image/png");

  const auto = m.autoDecode(new TextEncoder().encode("hello world"));
  assert.equal(auto.type, "text");
});

group("processor+registry+lifecycle+debug", async () => {
  m.clearLogs();
  async function* src() { yield m.json({ n: 1 }); yield m.json({ n: 2 }); yield m.json({ n: 3 }); }
  const p = m.createProcessor({
    name: "doubler",
    input: src(),
    transform: (flow) => flow.map((c) => m.json({ n: c.data.n * 2 })),
  });
  const out = [];
  for await (const c of p.output) out.push(c.data.n);
  assert.deepEqual(out, [2, 4, 6]);

  const snap = m.registry.snapshot();
  const found = snap.find((s) => s.name === "doubler");
  assert.ok(found, "registry has doubler");
  assert.equal(found.chunksIn, 3);
  assert.equal(found.chunksOut, 3);

  const actor = m.createProcessorActor("manual");
  assert.equal(actor.status, "idle");
  actor.send({ type: "START" });
  assert.equal(actor.status, "running");
  actor.send({ type: "ERROR", message: "boom" });
  assert.equal(actor.status, "error");
  assert.equal(actor.context.errors[0], "boom");
  actor.send({ type: "RESET" });
  assert.equal(actor.status, "idle");

  const debug = m.debugSnapshot();
  assert.ok(debug.processors.length >= 1);
  assert.ok(typeof debug.ts === "number");
  m.debugLog("test", "info", "smoke");
  assert.ok(m.debugLogs().some((e) => e.message === "smoke"));
});

group("operators+buffer", async () => {
  const data = new TextEncoder().encode("hello world");
  assert.equal(m.toHex(data), "68656c6c6f20776f726c64");
  assert.deepEqual(m.fromHex(m.toHex(data)), data);
  assert.equal(m.toBase64(data), "aGVsbG8gd29ybGQ=");
  assert.deepEqual(m.fromBase64(m.toBase64(data)), data);
  assert.equal(m.toHex(m.digest(data)).slice(0, 8), "b94d27b9");

  const gz = m.gzip(data);
  assert.deepEqual(m.gunzip(gz), data);
  assert.deepEqual(m.decompress(m.compress(data, "brotli"), "brotli"), data);

  assert.equal(m.indexOf(new TextEncoder().encode("a,b,c"), new TextEncoder().encode(",")), 1);
  assert.equal(m.splitBytes(new TextEncoder().encode("a,b,c"), new TextEncoder().encode(",")).length, 3);
  assert.ok(m.hexdump(data).includes("hello world"));

  async function* nums() { for (let i = 1; i <= 5; i++) yield m.json({ i }); }
  const taken = [];
  const node = m.take(3);
  const flow = node.transform((await import("sflow")).sflow(nums()));
  for await (const v of flow) taken.push(v.data.i);
  assert.deepEqual(taken, [1, 2, 3]);
});

group("file+stdio+ws+cli+frame", async () => {
  const dir = mkdtempSync(join(tmpdir(), "floosie-"));
  try {
    const p = join(dir, "test.json");
    writeFileSync(p, JSON.stringify({ k: "v" }));
    const chunks = [];
    for await (const c of m.fileSource(p)) chunks.push(c);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].type, "json");

    const out = join(dir, "out.ndjson");
    async function* gen() { yield m.json({ a: 1 }); yield m.json({ a: 2 }); }
    await m.fileSink(out, gen());
    const lines = readFileSync(out, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);

    const frame = m.encodeWsFrame(m.json({ x: 7 }));
    const back = m.decodeWsFrame(frame);
    assert.equal(back.type, "json");
    assert.deepEqual(back.data, { x: 7 });

    const port = 19000 + Math.floor(Math.random() * 1000);
    const server = await m.wsBridge({ port });
    const got = [];
    const consume = (async () => { for await (const c of server.source()) { got.push(c); if (got.length >= 1) break; } })();
    const ws = new WebSocket(`ws://localhost:${port}`);
    await new Promise((r) => ws.once("open", r));
    ws.send(m.encodeWsFrame(m.json({ ping: 1 })));
    await consume;
    ws.close();
    await server.close();
    assert.equal(got[0].type, "json");
    assert.deepEqual(got[0].data, { ping: 1 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

let failed = 0;
for (const g of groups) {
  try { await g.fn(); console.log(`ok ${g.name}`); }
  catch (e) { failed++; console.error(`FAIL ${g.name}:`, e.message); console.error(e.stack); }
}
console.log(`\n${groups.length - failed}/${groups.length} passed`);
process.exit(failed ? 1 : 0);
