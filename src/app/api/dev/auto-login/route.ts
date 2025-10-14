import { db } from '@/server/db';

export async function GET(req: Request) {
  // Only allow in non-production
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || undefined;
  const configured = process.env.DEV_LOGIN_SECRET;

  if (configured && secret !== configured) {
    return new Response('Unauthorized', { status: 401 });
  }

  const email = url.searchParams.get('email') || 'owner@example.com';

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return new Response('User not found', { status: 404 });

  const crypto = await import('crypto');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  // Set cookie compatible with next-auth database sessions on localhost (dev-only)
  const maxAge = 30 * 24 * 60 * 60;
  const cookie = `next-auth.session-token=${sessionToken}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store',
    },
  });
}
