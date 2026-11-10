import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function createStaticServer(root) {
  root = await realpath(resolve(root));
  const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp3':'audio/mpeg' };
  return createServer(async (req, res) => {
    try {
      if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = resolve(root, '.' + path);
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      file = await realpath(file);
      if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = await createStaticServer(process.env.QA_SITE_DIR || 'demo');
  server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('QA local server ready'));
}
