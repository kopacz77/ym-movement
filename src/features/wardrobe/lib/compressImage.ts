// src/features/wardrobe/lib/compressImage.ts
//
// Client-side image compression primitive for wardrobe dress uploads.
// Consumed only from the browser — do NOT import this from server code.
//
// Pipeline (per file):
//   1. Detect HEIC/HEIF by magic bytes (browsers misreport mime type)
//   2. If HEIC → convert to JPEG (dynamic import of heic2any so the wasm
//      blob is only fetched when actually needed — zero impact on JPEG path)
//   3. Compress via browser-image-compression in a Web Worker
//      Targets 1600px max dimension, 80% initial quality, ~400KB output
//   4. Return File with image/jpeg type so the server route accepts it
//
// Pre-compression sanity cap: 50MB. Raw photos from any consumer camera fit
// well under this. The compressed output should always land under the server's
// 5MB cap.

import imageCompression from "browser-image-compression";

const TARGET_SIZE_MB = 0.4; // ~400KB target after compression
const MAX_DIMENSION = 1600;
const INITIAL_QUALITY = 0.8;
const RAW_MAX_BYTES = 50 * 1024 * 1024; // 50MB sanity cap

// HEIC/HEIF magic-byte signatures. ISO base media format puts ftyp at bytes 4-7
// followed by a 4-byte brand. HEIC brands: 'heic', 'heix', 'hevc', 'hevx',
// 'heim', 'heis', 'hevm', 'hevs', 'mif1' (HEIF). Also 'avif' which we don't
// convert — modern browsers decode AVIF natively.
const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
]);

async function isHeic(file: File): Promise<boolean> {
  // Fast path: trust the mime type when it says HEIC.
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") {
    return true;
  }

  // Fallback: read first 12 bytes and check ftyp box. iOS Safari sometimes
  // reports HEIC as application/octet-stream or empty string.
  const head = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(head);
  // Bytes 4..7 must be the ASCII 'ftyp'
  if (
    bytes[4] !== 0x66 || // f
    bytes[5] !== 0x74 || // t
    bytes[6] !== 0x79 || // y
    bytes[7] !== 0x70 // p
  ) {
    return false;
  }
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
  return HEIC_BRANDS.has(brand);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  // Dynamic import — heic2any is ~600KB gzipped (libheif wasm). Only paid for
  // when the user actually selects a HEIC file. Zero impact on JPEG/PNG/WEBP.
  const { default: heic2any } = await import("heic2any");
  const blob = (await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  })) as Blob;
  // heic2any returns Blob[] for multi-image HEIC; we always pass single-image
  // photos so the cast above is safe in practice. If a user uploads a HEIC
  // burst (rare), the first frame wins.
  const single = Array.isArray(blob) ? blob[0] : blob;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([single], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function compressForUpload(file: File): Promise<File> {
  if (file.size > RAW_MAX_BYTES) {
    throw new Error(
      `File too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Max 50MB before compression.`,
    );
  }

  let workingFile = file;
  if (await isHeic(file)) {
    workingFile = await convertHeicToJpeg(file);
  }

  // useWebWorker: false — the lib's worker mode tries to load itself from
  // cdn.jsdelivr.net at runtime via importScripts, which CSP correctly blocks.
  // Main-thread compression is plenty fast for our <1MB pre-compression inputs
  // (rough budget: ~250ms for a 5MB photo on a midrange phone).
  return imageCompression(workingFile, {
    maxSizeMB: TARGET_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: false,
    initialQuality: INITIAL_QUALITY,
    fileType: workingFile.type === "image/png" ? "image/png" : "image/jpeg",
  });
}
