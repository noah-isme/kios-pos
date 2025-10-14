"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    (async () => {
      try {
        // fetch csrf token JSON
        const res = await fetch('/api/auth/csrf', { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('Failed to fetch csrf');
        const data = await res.json();
        const csrfToken = data?.csrfToken;

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/api/auth/signout';

        const csrfInput = document.createElement('input');
        csrfInput.type = 'hidden';
        csrfInput.name = 'csrfToken';
        csrfInput.value = csrfToken || '';
        form.appendChild(csrfInput);

        const cb = document.createElement('input');
        cb.type = 'hidden';
        cb.name = 'callbackUrl';
        cb.value = '/auth/login';
        form.appendChild(cb);

        document.body.appendChild(form);
        form.submit();
      } catch (err) {
        // fallback: redirect to login
        window.location.href = '/auth/login';
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="mb-2">Signing out…</p>
        <p className="text-sm text-muted-foreground">If you are not redirected, <a href="/auth/login" className="underline">go to login page</a>.</p>
      </div>
    </div>
  );
}
