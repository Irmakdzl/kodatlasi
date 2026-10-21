/**
 * KodAtlası · Mini Statik Sunucu
 * ------------------------------------------------------------------
 * Harici bir paket kurmadan (npm install yok) projeyi sunmak için
 * yazılmıştır. Yalnızca Node.js yerleşik modüllerini kullanır.
 *
 *   node server.js          -> http://localhost:5173
 *   node server.js --open   -> tarayıcıyı otomatik açar
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  } catch {
    response.writeHead(400).end('400 - Geçersiz adres');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);

  // Klasör dışına çıkışı engelle.
  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403).end('403 - Erişim reddedildi');
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('404 - Dosya bulunamadı: ' + pathname);
      return;
    }

    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    response.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
    });

    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, () => {
  const address = `http://localhost:${PORT}`;
  console.log('');
  console.log('  KodAtlası çalışıyor');
  console.log('  -----------------------');
  console.log('  Adres : ' + address);
  console.log('  Durdurmak için: Ctrl + C');
  console.log('');

  if (process.argv.includes('--open')) openBrowser(address);
});

function openBrowser(url) {
  const commands = {
    win32: { command: 'cmd', args: ['/c', 'start', '', url] },
    darwin: { command: 'open', args: [url] },
    linux: { command: 'xdg-open', args: [url] },
  };
  const target = commands[process.platform];
  if (!target) return;
  try {
    spawn(target.command, target.args, { detached: true, stdio: 'ignore' }).unref();
  } catch (error) {
    console.warn('Tarayıcı otomatik açılamadı, adresi elle açın:', url);
  }
}
