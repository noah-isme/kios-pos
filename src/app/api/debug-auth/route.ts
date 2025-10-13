export async function GET() {
  try {
    const mod = await import('@/server/auth');
    const keys = Object.keys(mod || {});
    const types: Record<string, string> = {};
    for (const k of keys) types[k] = typeof (mod as any)[k];
    return new Response(JSON.stringify({ ok: true, keys, types }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[debug-auth] import error', err?.stack ?? err?.message ?? err);
    return new Response(JSON.stringify({ ok: false, error: String(err?.message ?? err), stack: String(err?.stack ?? '') }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
