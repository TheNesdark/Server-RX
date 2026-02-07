import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'build');
const EXE_NAME = 'server-rx.exe';

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('=== Build Server-RX .exe ===\n');

  // 1. Build Astro
  console.log('[1/6] Building Astro...');
  run('npx astro build');

  // 2. Clean output dir
  console.log('\n[2/6] Preparing output directory...');
  if (fs.existsSync(OUTPUT)) {
    fs.rmSync(OUTPUT, { recursive: true });
  }
  fs.mkdirSync(OUTPUT, { recursive: true });

  // 3. Copy dist + config
  console.log('\n[3/6] Copying dist, config & dependencies...');
  copyDir(path.join(ROOT, 'dist', 'server'), path.join(OUTPUT, 'dist', 'server'));
  copyDir(path.join(ROOT, 'dist', 'client'), path.join(OUTPUT, 'dist', 'client'));

  // Copy config.json template
  const configSrc = path.join(ROOT, 'config.json');
  if (fs.existsSync(configSrc)) {
    fs.copyFileSync(configSrc, path.join(OUTPUT, 'config.json'));
  }

  // Install production-only dependencies in output
  fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(OUTPUT, 'package.json'));
  fs.copyFileSync(path.join(ROOT, 'package-lock.json'), path.join(OUTPUT, 'package-lock.json'));
  run('npm ci --omit=dev', { cwd: OUTPUT });

  // Clean up package files (no longer needed)
  fs.unlinkSync(path.join(OUTPUT, 'package.json'));
  fs.unlinkSync(path.join(OUTPUT, 'package-lock.json'));

  // 4. Generate SEA blob
  console.log('\n[4/6] Generating SEA blob...');
  run('node --experimental-sea-config sea-config.json');

  // 5. Create the exe
  console.log('\n[5/6] Creating executable...');
  const nodeExe = process.execPath;
  const outputExe = path.join(OUTPUT, EXE_NAME);
  fs.copyFileSync(nodeExe, outputExe);

  // Remove Windows signature so we can inject the blob
  try {
    run(`npx postject --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 "${outputExe}" NODE_SEA_BLOB sea-prep.blob`);
  } catch {
    // If postject fails due to signature, try removing it first with signtool
    console.log('Retrying with signature removal...');
    run(`npx -y @aspect-build/signtool remove "${outputExe}"`);
    run(`npx postject --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 "${outputExe}" NODE_SEA_BLOB sea-prep.blob`);
  }

  // 6. Clean up blob
  const blobPath = path.join(ROOT, 'sea-prep.blob');
  if (fs.existsSync(blobPath)) {
    fs.unlinkSync(blobPath);
  }

  console.log('\n[6/6] Done!');
  console.log(`\nOutput: ${OUTPUT}`);
  console.log(`Executable: ${outputExe}`);
  console.log('\nTo run: cd build && .\\server-rx.exe');
}

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
