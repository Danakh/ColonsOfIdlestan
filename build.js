import { build } from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Trouver tous les fichiers TypeScript dans src
function getAllTsFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  files.forEach(file => {
    const filePath = join(dir, file);
    if (statSync(filePath).isDirectory()) {
      getAllTsFiles(filePath, fileList);
    } else if (file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const entryPoints = getAllTsFiles('./src').filter(f => 
  !f.includes('.test.') && !f.includes('node_modules')
);

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
