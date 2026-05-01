import { createProcessor, json, text, registry } from "./index.js";
import type { JsonChunk, TextChunk } from "./index.js";

async function* msgs() {
  yield json({ msg: "hello" });
  yield json({ msg: "world" });
  yield json({ msg: "stream" });
}

const upper = createProcessor<JsonChunk<{ msg: string }>, TextChunk>({
  name: "upper",
  input: msgs(),
  transform: (flow) =>
    flow.map((chunk) => text(String(chunk.data.msg).toUpperCase())),
});

const exclaim = createProcessor<TextChunk, TextChunk>({
  name: "exclaim",
  transform: (flow) =>
    flow.map((chunk) => text(chunk.data + "!!!")),
});

const pipeline = upper.pipe(exclaim);

for await (const chunk of pipeline.output as AsyncIterable<TextChunk>) {
  console.log(chunk.data);
}

console.log("\nRegistry:", registry.snapshot());
