### 0.6.0 — 2026-04-14
- Add xstate v5 ProcessorMachine (idle/running/error/stopped) — replaces manual status mutation
- Registry stores Actor per processor; status and context read from actor snapshots
- ProcessorHandle gains stdout+stderr dual streams — error/signal chunks route to stderr
- src/machine.ts: ProcessorMachine definition and ProcessorContext type
- src/streams.ts: splitStream fan-out — error/signal to stderr queue, rest to stdout queue
- stdio.ts: writeChunk routes error/signal types to process.stderr, others to process.stdout
- acp.ts: error handler uses state.send ERROR event instead of direct mutation

### 0.5.0 — 2026-04-14
- Replace hand-rolled signature table with file-type (183 formats: ELF, Mach-O, SQLite, zstd, lz4, fonts, and 170+ more)
- Add detectFile(Uint8Array): Promise<FileInfo> — rich async detection with mime, ext, charset, description
- Add text heuristics layer: shebang (python/node/ruby/perl/php/sh), XML, HTML, JSON, YAML, PEM, encoding detection
- Add BOM detection (UTF-32 LE/BE, UTF-16 LE/BE, UTF-8) — prevents UTF-16 BOM misdetection as audio/mpeg
- Add binary heuristic: >30% high bytes → application/octet-stream
- Keep detectMime(Uint8Array): string sync for codec decode path (backward compat)
- Export FileInfo type and detectFile from index.ts

### 0.4.2 — 2026-04-14
- Full validation pass 2: all 0.3.0 codec types (numeric, bigint, complex, jsonHeaderCodec binary-envelope types, NDJSON structured types), registry inspect/snapshot/deregister, stdio length-prefix framing, ACP source/sink lifecycle (handler registration ordering, abort termination), operator chain composition (gate+limit, scan, mux, batch, parallel, distinct, withBackpressure)

### 0.4.1 — 2026-04-14
- Fix detectMime: MP4 ftyp box detection now handles variable box sizes (any 4-byte length prefix followed by ftyp at offset 4)
- Full validation pass: createProcessor lifecycle, registry, pipeline composition, framing, operators, error paths all verified

### 0.4.0 — 2026-04-14
- Added src/operators.ts: mux, split, gate, scan, zip, withBackpressure, batch, window, throttle, debounce, take, drop, distinct, parallel
- All operators are typed StreamNode factories wrapping sflow primitives
- mux: N-source merge (interleaved); split: N-way fan-out via chained tees
- gate: async predicate filter; scan: running accumulator
- zip: N-source tuple stream; withBackpressure: explicit HWM pause/resume
- batch/window: chunk by count or time interval
- parallel: concurrent async map with configurable concurrency
- All exported from index.ts

### 0.3.0 — 2026-04-14
- Added 52 new chunk types: wasm, font, onnx, safetensors, epub, docx, xlsx, pptx, gltf, qrcode, toml, ini, jsonschema, avroschema, sourcemap, shader, obj, subtitle, playlist, graphml, socketio, webtransport, envelope, ack, nack, ast, hash, signature, tensor, timeseries, ohlcv, adjacency, pointcloud, keypair, certificate, hmac, dns, dhcp, icmp, ciphertext, int8, int16, uint16, uint32, int64, uint64, float32, complex64, complex128
- chunk-aliases.ts: Extract<Chunk,{type:K}> aliases split from chunk-types.ts to stay under 200L limit
- fixedBig(): new codec helper for int64/uint64 using DataView BigInt64/BigUint64 LE
- jsonHeaderCodec(): generic 4-byte BE header-length + JSON header + raw payload for frame/multipart/ciphertext/signature/hmac/keypair/certificate/tensor/pointcloud/webtransport
- COMPLEX_CODEC: complex64 (2×float32) and complex128 (2×float64) encoding
- int64/uint64 use bigint data type; complex64/complex128 use {re,im} Complex interface

### 0.2.0 — 2026-04-14
- Added 17 new chunk types: protobuf, msgpack, cbor, arrow, parquet, geojson, jwt, graphql, rpc, event, span, metric, log, command, frame, patch, multipart
- Added mime.ts: magic-byte detection for 35 binary formats (images, video, audio, pdf, archives, arrow, parquet)
- Binary chunk decode now populates meta.mime automatically for all binary passthrough types
- frame codec: length-prefixed JSON header + raw pixel data
- multipart codec: length-prefixed JSON header + raw binary payload with auto mime detection

