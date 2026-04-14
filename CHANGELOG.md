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

