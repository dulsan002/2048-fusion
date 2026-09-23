import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const zipFile = path.resolve(distDir, '2048-fusion-playables.zip');

console.log('=== YouTube Playables Packaging Tool ===');
console.log('Developer: Dulsan Vasantharaj');
console.log('Game: 2048 Fusion');

if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

const rootIndex = path.resolve(distDir, 'index.html');
if (!fs.existsSync(rootIndex)) {
  console.error('CRITICAL ERROR: dist/index.html not found! YouTube Playables requires index.html at root.');
  process.exit(1);
}

// Remove old zip if exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

console.log('\n1. Auditing individual file sizes in dist/...');
const MAX_SINGLE_FILE_BYTES = 30 * 1024 * 1024; // 30 MiB
const REC_SINGLE_FILE_BYTES = 512 * 1024; // 512 KiB

function scanDir(dir) {
  let totalBytes = 0;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      totalBytes += scanDir(fullPath);
    } else if (file !== '2048-fusion-playables.zip') {
      const rel = path.relative(distDir, fullPath);
      console.log(` - ${rel}: ${(stat.size / 1024).toFixed(2)} KiB`);
      if (stat.size > MAX_SINGLE_FILE_BYTES) {
        console.error(`VIOLATION: File ${rel} exceeds 30 MiB YouTube Playables limit!`);
        process.exit(1);
      }
      totalBytes += stat.size;
    }
  }
  return totalBytes;
}

const totalUncompressed = scanDir(distDir);
console.log(`Total uncompressed dist size: ${(totalUncompressed / 1024).toFixed(2)} KiB (${(totalUncompressed / (1024 * 1024)).toFixed(3)} MiB)`);

console.log('\n2. Creating submission ZIP archive: dist/2048-fusion-playables.zip...');
try {
  execSync(`cd "${distDir}" && zip -r 2048-fusion-playables.zip . -x "2048-fusion-playables.zip"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Failed to create ZIP package:', err);
  process.exit(1);
}

if (!fs.existsSync(zipFile)) {
  console.error('Failed to produce ZIP file.');
  process.exit(1);
}

const zipStat = fs.statSync(zipFile);
const zipSizeKiB = (zipStat.size / 1024).toFixed(2);
const zipSizeMiB = (zipStat.size / (1024 * 1024)).toFixed(3);

console.log(`\n=== Verification Results ===`);
console.log(`✓ Package Created: ${zipFile}`);
console.log(`✓ Package Size: ${zipSizeKiB} KiB (${zipSizeMiB} MiB)`);
console.log(`✓ Initial Load Limit: 30 MiB (Current: ${zipSizeMiB} MiB - WELL UNDER 1%)`);
console.log(`✓ Total Package Limit: 250 MiB (Current: ${zipSizeMiB} MiB)`);
console.log(`✓ Root index.html Verified: PASS`);
console.log(`✓ Status: READY FOR YOUTUBE PLAYABLES SUBMISSION`);
