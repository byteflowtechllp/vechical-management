// Simple script to generate placeholder PWA icons
// Run: node generate-icons.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a simple SVG icon
const createSVGIcon = (size) => {
  const color = '#2563eb';
  const text = 'VM';
  const fontSize = size * 0.4;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${color}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>`;
};

// Convert SVG to data URI (browser will handle it)
const svgToDataURI = (svg) => {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
const sizes = [192, 512];

console.log('Generating PWA icons...');

sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = path.join(publicDir, `pwa-${size}x${size}.png`);
  
  // Save as SVG temporarily - browsers can use SVG for icons
  // For production, convert to PNG using: npx @svgr/cli or online tool
  const svgFilename = path.join(publicDir, `pwa-${size}x${size}.svg`);
  fs.writeFileSync(svgFilename, svg);
  
  console.log(`✓ Created ${svgFilename}`);
  console.log(`  Note: Convert to PNG using an online tool or ImageMagick`);
  console.log(`  Recommended: https://cloudconvert.com/svg-to-png`);
});

console.log('\nFor PNG icons, you can:');
console.log('1. Use an online converter (cloudconvert.com, convertio.co)');
console.log('2. Install ImageMagick: brew install imagemagick');
console.log('3. Run: convert public/pwa-192x192.svg public/pwa-192x192.png');
console.log('\nOr manually create PNG icons with your branding.');

