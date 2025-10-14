export async function GET() {
  try {
    const auth = await import('@/server/auth');
    if (typeof auth.GET !== 'function' && typeof auth.handler !== 'function') {
      return new Response(JSON.stringify({ ok: false, reason: 'no handler' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const fn = typeof auth.GET === 'function' ? auth.GET : auth.handler;

    // Build a request-like object resembling the shape NextAuth expects.
    // Create a real Request so the handler receives an instance of Request.
    const authReq = new Request('http://localhost/api/auth/providers', { method: 'GET' });

    try {
      const res = await fn(authReq as Request);
      // If the result looks like a Response-like with a text() method, read it.
      if (res && typeof (res as { text?: unknown }).text === 'function') {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const text = await (res as { text: () => Promise<string> }).text();
  const status = (res as unknown as { status?: number }).status ?? 200;
  return new Response(JSON.stringify({ ok: true, status, body: text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, result: String(res) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (innerErr: unknown) {
      console.error('[debug-auth-invoke] handler threw', (innerErr as Error)?.stack ?? String(innerErr));
      return new Response(JSON.stringify({ ok: false, error: String((innerErr as Error)?.message ?? innerErr), stack: String((innerErr as Error)?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err: unknown) {
    console.error('[debug-auth-invoke] import error', (err as Error)?.stack ?? String(err));
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err), stack: String((err as Error)?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
