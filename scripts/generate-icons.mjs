/**
 * Icon generation script.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install -D sharp (optional, for PNG conversion)
 *
 * If sharp is not available, use the SVG directly and convert manually,
 * or use an online converter to produce icon-16.png, icon-48.png, icon-128.png.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '../public/icons/icon.svg');
const svg = readFileSync(svgPath, 'utf-8');

console.log('SVG icon is at public/icons/icon.svg');
console.log('To generate PNGs, install sharp: npm install -D sharp');
console.log('Then run: node scripts/generate-icons.mjs');

// Try to use sharp if available
try {
  const sharp = await import('sharp').then(m => m.default);
  const sizes = [16, 48, 128];
  for (const size of sizes) {
    const outPath = join(__dirname, `../public/icons/icon-${size}.png`);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Generated icon-${size}.png`);
  }
} catch {
  console.log('sharp not available — manually convert icon.svg to PNG at sizes 16, 48, 128');
}
