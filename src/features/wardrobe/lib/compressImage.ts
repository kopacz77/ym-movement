// src/features/wardrobe/lib/compressImage.ts
//
// Client-side image compression primitive for wardrobe dress uploads.
// Consumed only from the browser — do NOT import this from server code.
//
// Targets ~400KB at 1600px max dimension and 80% initial quality, with
// compression performed off the main thread via a Web Worker. The pre-flight
// size check mirrors the 5MB server cap so the user fails fast before bytes
// leave the device; the server still enforces the same cap as defense in depth.

import imageCompression from "browser-image-compression";

const TARGET_SIZE_MB = 0.4; // ~400KB target after compression
const MAX_DIMENSION = 1600;
const INITIAL_QUALITY = 0.8;

const RAW_MAX_BYTES = 5 * 1024 * 1024; // mirror the server cap

export async function compressForUpload(file: File): Promise<File> {
  if (file.size > RAW_MAX_BYTES) {
    throw new Error(
      `File exceeds 5MB pre-compression limit (got ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
    );
  }
  return imageCompression(file, {
    maxSizeMB: TARGET_SIZE_MB,
    maxWidthOrHeight: MAX_DIMENSION,
    useWebWorker: true,
    initialQuality: INITIAL_QUALITY,
    fileType: file.type === "image/png" ? "image/png" : "image/jpeg",
  });
}
