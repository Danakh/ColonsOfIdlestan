import { build } from 'esbuild';
import { readdirSync, statSync, mkdirSync, cpSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Créer le répertoire dist s'il n'existe pas, ou le nettoyer s'il existe
const distDir = join(__dirname, 'dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}
mkdirSync(distDir, { recursive: true });

// Copier index.html dans dist/
const indexHtmlPath = join(__dirname, 'index.html');
const distIndexHtmlPath = join(distDir, 'index.html');
cpSync(indexHtmlPath, distIndexHtmlPath);

// Copier styles.css dans dist/
const stylesCssPath = join(__dirname, 'styles.css');
const distStylesCssPath = join(distDir, 'styles.css');
cpSync(stylesCssPath, distStylesCssPath);

// Copier public/assets/ dans dist/assets/ (en conservant la structure)
const publicAssetsDir = join(__dirname, 'public', 'assets');
const distAssetsDir = join(distDir, 'assets');
if (existsSync(publicAssetsDir)) {
  cpSync(publicAssetsDir, distAssetsDir, { recursive: true });
}

// Bundler le TypeScript avec esbuild
build({
  entryPoints: ['./src/main.ts'],
  bundle: true,
  outfile: './dist/main.js',
  format: 'esm',
  target: 'es2020',
  platform: 'browser',
  sourcemap: true,
  minify: false,
}).catch(() => process.exit(1));
