export async function GET() {
  try {
    const auth = await import('@/server/auth');
    if (typeof auth.GET !== 'function' && typeof auth.handler !== 'function') {
      return new Response(JSON.stringify({ ok: false, reason: 'no handler' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const fn = typeof auth.GET === 'function' ? auth.GET : auth.handler;

    // Build a request-like object that contains a `query.nextauth` array which
    // NextAuth internals expect when handling catch-all routes.
    const authReq: any = {
      method: 'GET',
      url: 'http://localhost/api/auth/providers',
      headers: new Headers(),
      query: { nextauth: ['providers'] },
      text: async () => '',
      json: async () => ({}),
    };

    try {
      const res: any = await fn(authReq as any);
      if (res && typeof res.text === 'function') {
        const text = await res.text();
        return new Response(JSON.stringify({ ok: true, status: res.status, body: text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, result: String(res) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (innerErr: any) {
      console.error('[debug-auth-invoke] handler threw', (innerErr as any)?.stack ?? (innerErr as any)?.message ?? innerErr);
      return new Response(JSON.stringify({ ok: false, error: String(innerErr?.message ?? innerErr), stack: String(innerErr?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err: any) {
    console.error('[debug-auth-invoke] import error', err?.stack ?? err?.message ?? err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err), stack: String(err?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
