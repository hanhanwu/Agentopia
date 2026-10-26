import type { IncomingMessage, ServerResponse } from 'node:http';

export class LocalAPIError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Local Studio services must not become cross-site or public proxies. */
export function requireLocalRequest(req: IncomingMessage) {
  const localNames = ['127.0.0.1', 'localhost', '[::1]'];
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress || '')) {
    throw new LocalAPIError(403, 'Local Studio requests only.');
  }
  try {
    const host = new URL(`http://${req.headers.host || 'invalid'}`);
    if (!localNames.includes(host.hostname) || host.username || host.password) {
      throw new LocalAPIError(403, 'Local Studio requests only.');
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') throw new LocalAPIError(403, 'Same-origin requests only.');
    if (req.headers.origin) {
      const origin = new URL(req.headers.origin);
      if (!localNames.includes(origin.hostname) || origin.port !== host.port || origin.protocol !== host.protocol) {
        throw new LocalAPIError(403, 'Same-origin requests only.');
      }
    }
  } catch (error) {
    if (error instanceof LocalAPIError) throw error;
    throw new LocalAPIError(403, 'Invalid local request origin.');
  }
}

export function sendJSON(res: ServerResponse, status: number, body: unknown) {
  if (res.destroyed) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
}

export async function readJSON(req: IncomingMessage, limit: number): Promise<unknown> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new LocalAPIError(415, 'Expected JSON.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > limit) throw new LocalAPIError(413, 'The request is too large.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new LocalAPIError(400, 'Invalid JSON request.'); }
}
