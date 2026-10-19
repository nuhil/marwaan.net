// Local static server for development. Mirrors GitHub Pages paths, but sends
// no-store headers so edited ES modules, CSS and models are never served stale.
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve('.');
const port = Number(process.env.PORT) || 8000;
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2',
};

function fileFor(urlPath) {
  try {
    const path = normalize(join(root, decodeURIComponent(urlPath)));
    if (path !== root && !path.startsWith(root + sep)) return null;
    const stat = statSync(path);
    if (stat.isDirectory()) return fileFor(join(urlPath, 'index.html'));
    return stat.isFile() ? path : null;
  } catch {
    return null;
  }
}

createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  const file = fileFor(urlPath);
  const target = file || fileFor('/404.html');
  res.writeHead(file ? 200 : 404, {
    'Content-Type': types[extname(target).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(target).pipe(res);
  console.log(`${file ? 200 : 404} ${req.method} ${urlPath}`);
}).listen(port, () => {
  console.log(`Wonder Lab running at http://localhost:${port}`);
  for (const net of Object.values(networkInterfaces()).flat()) {
    if (net.family === 'IPv4' && !net.internal) console.log(`On your network:  http://${net.address}:${port}`);
  }
});
