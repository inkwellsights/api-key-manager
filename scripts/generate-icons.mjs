// Generates PWA icons (192, 512, maskable) from an inline SVG. Run: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

// Violet rounded-square brand mark with a white link glyph (matches the sidebar logo).
// `pad` controls the glyph safe-zone: smaller glyph (more padding) for the maskable variant.
function svg({ rounded, glyphScale }) {
  const cx = 256;
  const s = glyphScale; // glyph target size in px (centered)
  const t = 24; // lucide viewBox
  const k = s / t;
  const off = cx - (t / 2) * k;
  const radius = rounded ? 112 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b6dff"/>
      <stop offset="1" stop-color="#5b3fd6"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="${radius}" ry="${radius}" fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${k})" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
    <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
    <line x1="8" x2="16" y1="12" y2="12"/>
  </g>
</svg>`;
}

const regular = Buffer.from(svg({ rounded: true, glyphScale: 230 }));
const maskable = Buffer.from(svg({ rounded: false, glyphScale: 190 })); // full-bleed + safe zone

await sharp(regular).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(regular).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
await sharp(regular).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(regular).resize(32, 32).png().toFile("public/icons/favicon-32.png");

console.log("Generated: icon-192, icon-512, icon-maskable-512, apple-touch-icon, favicon-32 in public/icons/");
