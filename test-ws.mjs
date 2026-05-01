import { wsBridge, muxWsClients, json } from "./dist/index.js";

const server = await wsBridge({ port: 17878 });
console.log("bridge:", server.url);

const mux = await muxWsClients([server.url, server.url]);

const received = [];
const consumer = (async () => {
  for await (const c of server.source()) {
    received.push(c);
    if (received.length >= 4) break;
  }
})();

mux.send(json({ n: 1 }));
mux.send(json({ n: 2 }));
mux.send(json({ n: 3 }), "broadcast");

await new Promise(r => setTimeout(r, 300));
mux.close();
await consumer;
await server.close();

console.log("received:", received.length, "chunks");
console.log(JSON.stringify(received, null, 2));
process.exit(received.length >= 4 ? 0 : 1);
