// SOLMAR dev server: serves game/ over HTTP so the game can be played and
// screenshot in a desktop browser. Usage: node serve.ts --port 8080
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) || 8080 : 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const file = normalize(join(root, rel));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const bytes = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  } catch (e) {
    res.writeHead(404);
    res.end('not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`SOLMAR dev server: http://127.0.0.1:${port}/`);
});
