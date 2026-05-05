import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';

const port = Number(process.env.PORT || 4321);
const root = new URL('./public/', import.meta.url).pathname;
const statePath = new URL('./data/state.json', import.meta.url).pathname;
const seedPath = new URL('./public/seed.json', import.meta.url).pathname;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolvePath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath;
  const decoded = decodeURIComponent(requested.split('?')[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  return join(root, normalized);
}

async function readState() {
  try {
    return await readFile(statePath, 'utf8');
  } catch {
    return await readFile(seedPath, 'utf8');
  }
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

createServer(async (req, res) => {
  if (req.url === '/api/state' && req.method === 'GET') {
    const body = await readState();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
    return;
  }

  if (req.url === '/api/state' && req.method === 'PUT') {
    try {
      const parsed = JSON.parse(await readBody(req));
      parsed.meta = {
        ...(parsed.meta || {}),
        source: statePath,
        lastSaved: new Date().toISOString(),
      };
      await mkdir(dirname(statePath), { recursive: true });
      const tmpPath = `${statePath}.tmp`;
      await writeFile(tmpPath, `${JSON.stringify(parsed, null, 2)}\n`);
      await rename(tmpPath, statePath);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, statePath }));
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  try {
    const filePath = resolvePath(req.url || '/');
    const body = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`big-dog-master listening on http://localhost:${port}`);
});
