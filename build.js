import { build } from 'esbuild';
import { readdirSync, statSync, mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supprimer le répertoire dist s'il existe
const distDir = join(__dirname, 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

// Copier public/assets/ dans assets/ à la racine (en conservant la structure)
const publicAssetsDir = join(__dirname, 'public', 'assets');
const rootAssetsDir = join(__dirname, 'assets');
if (existsSync(publicAssetsDir)) {
  if (existsSync(rootAssetsDir)) {
    rmSync(rootAssetsDir, { recursive: true, force: true });
  }
  cpSync(publicAssetsDir, rootAssetsDir, { recursive: true });
}

// Bundler le TypeScript avec esbuild (génération à la racine)
build({
  entryPoints: ['./src/main.ts'],
  bundle: true,
  outfile: './main.js',
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  sourcemap: true,
  minify: false,
}).catch(() => process.exit(1));
