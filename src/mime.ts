import { fileTypeFromBuffer } from "file-type";

export type FileInfo = {
  mime: string;
  ext?: string;
  charset?: string;
  description?: string;
};

const SIGS: Array<[number[], string]> = [
  [[0xff,0xd8,0xff],                                                              "image/jpeg"],
  [[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],                                    "image/png"],
  [[0x47,0x49,0x46,0x38],                                                         "image/gif"],
  [[0x52,0x49,0x46,0x46],                                                         "image/webp"],
  [[0x42,0x4d],                                                                   "image/bmp"],
  [[0x49,0x49,0x2a,0x00],                                                         "image/tiff"],
  [[0x4d,0x4d,0x00,0x2a],                                                         "image/tiff"],
  [[0x00,0x00,0x01,0x00],                                                         "image/x-icon"],
  [[0x66,0x74,0x79,0x70,0x61,0x76,0x69,0x66],                                    "image/avif"],
  [[0x1a,0x45,0xdf,0xa3],                                                         "video/webm"],
  [[0x00,0x00,0x01,0xba],                                                         "video/mpeg"],
  [[0x00,0x00,0x01,0xb3],                                                         "video/mpeg"],
  [[0x4f,0x67,0x67,0x53],                                                         "audio/ogg"],
  [[0x49,0x44,0x33],                                                              "audio/mpeg"],
  [[0xff,0xfb],                                                                   "audio/mpeg"],
  [[0xff,0xf3],                                                                   "audio/mpeg"],
  [[0xff,0xf2],                                                                   "audio/mpeg"],
  [[0x66,0x4c,0x61,0x43],                                                         "audio/flac"],
  [[0x25,0x50,0x44,0x46],                                                         "application/pdf"],
  [[0x50,0x4b,0x03,0x04],                                                         "application/zip"],
  [[0x50,0x4b,0x05,0x06],                                                         "application/zip"],
  [[0x50,0x4b,0x07,0x08],                                                         "application/zip"],
  [[0x52,0x61,0x72,0x21,0x1a,0x07],                                              "application/x-rar-compressed"],
  [[0x1f,0x8b],                                                                   "application/gzip"],
  [[0x42,0x5a,0x68],                                                              "application/x-bzip2"],
  [[0xfd,0x37,0x7a,0x58,0x5a,0x00],                                              "application/x-xz"],
  [[0x37,0x7a,0xbc,0xaf,0x27,0x1c],                                              "application/x-7z-compressed"],
  [[0x41,0x52,0x52,0x4f,0x57,0x31,0x00,0x00],                                    "application/vnd.apache.arrow.file"],
  [[0x50,0x41,0x52,0x31],                                                         "application/vnd.apache.parquet"],
  [[0x00,0x61,0x73,0x6d],                                                         "application/wasm"],
  [[0x7f,0x45,0x4c,0x46],                                                         "application/x-elf"],
  [[0x4d,0x5a],                                                                   "application/x-msdownload"],
  [[0xce,0xfa,0xed,0xfe],                                                         "application/x-mach-binary"],
  [[0xcf,0xfa,0xed,0xfe],                                                         "application/x-mach-binary"],
  [[0xfe,0xed,0xfa,0xce],                                                         "application/x-mach-binary"],
  [[0xfe,0xed,0xfa,0xcf],                                                         "application/x-mach-binary"],
  [[0x53,0x51,0x4c,0x69,0x74,0x65,0x20,0x66,0x6f,0x72,0x6d,0x61,0x74,0x20,0x33,0x00], "application/x-sqlite3"],
];

const FTYP = [0x66, 0x74, 0x79, 0x70];

export function detectMime(data: Uint8Array): string {
  for (const [sig, mime] of SIGS) {
    if (sig.every((b, i) => data[i] === b)) return mime;
  }
  if (data.length >= 8 && FTYP.every((b, i) => data[4 + i] === b)) return "video/mp4";
  return "application/octet-stream";
}

const BOMS: Array<[number[], string]> = [
  [[0xff, 0xfe, 0x00, 0x00], "utf-32le"],
  [[0x00, 0x00, 0xfe, 0xff], "utf-32be"],
  [[0xff, 0xfe],             "utf-16le"],
  [[0xfe, 0xff],             "utf-16be"],
  [[0xef, 0xbb, 0xbf],       "utf-8"],
];

const TEXT_PATTERNS: Array<[RegExp, string, string]> = [
  [/^%!PS/,              "application/postscript", "ps"],
  [/^#!.*python/,        "text/x-python",          "py"],
  [/^#!.*node/,          "text/javascript",        "js"],
  [/^#!.*ruby/,          "text/x-ruby",            "rb"],
  [/^#!.*perl/,          "text/x-perl",            "pl"],
  [/^#!.*php/,           "text/x-php",             "php"],
  [/^#!\//,              "text/x-shellscript",     "sh"],
  [/^<\?xml/i,           "application/xml",        "xml"],
  [/^<!DOCTYPE\s+html/i, "text/html",              "html"],
  [/^<html/i,            "text/html",              "html"],
  [/^\s*[{[]/,           "application/json",       "json"],
  [/^---\s*\n/,          "application/x-yaml",     "yaml"],
  [/^-----BEGIN /,       "application/x-pem-file", "pem"],
];

export async function detectFile(data: Uint8Array): Promise<FileInfo> {
  for (const [bom, charset] of BOMS) {
    if (bom.every((b, i) => data[i] === b)) {
      return { mime: "text/plain", ext: "txt", charset, description: charset + " text" };
    }
  }
  const r = await fileTypeFromBuffer(data);
  if (r) return { mime: r.mime, ext: r.ext };
  const sample = data.subarray(0, Math.min(512, data.length));
  const highBytes = sample.reduce((n, b) => n + (b > 127 ? 1 : 0), 0);
  if (highBytes / sample.length > 0.3) return { mime: "application/octet-stream" };
  const text = new TextDecoder("utf-8", { fatal: false }).decode(sample);
  for (const [re, mime, ext] of TEXT_PATTERNS) {
    if (re.test(text)) return { mime, ext };
  }
  const charset = sample.every((b) => b < 128) ? "us-ascii" : "utf-8";
  return { mime: "text/plain", ext: "txt", charset, description: charset + " text" };
}
