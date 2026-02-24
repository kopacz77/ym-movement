const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "icon.svg");
const svg = fs.readFileSync(svgPath);

async function generate() {
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, "icon-192.png"));

  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, "icon-512.png"));

  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));

  console.log("Icons generated successfully:");
  console.log("  - icon-192.png (192x192)");
  console.log("  - icon-512.png (512x512)");
  console.log("  - apple-touch-icon.png (180x180)");
}

generate().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
