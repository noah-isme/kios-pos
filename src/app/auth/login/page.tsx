"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const router = useRouter();

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (password) {
        // use credentials provider
        const res = await signIn('credentials', { redirect: false, email, password });
        if ((res as any)?.error) {
          setMessage(`Gagal login: ${(res as any).error}`);
        } else {
          // successful sign in will redirect automatically if redirect omitted in client
          window.location.href = '/';
        }
      } else {
        const res = await signIn("email", { email, redirect: false });
        if ((res as any)?.ok) {
          setMessage("Magic link dikirim ke email (cek konsol jika menggunakan jsonTransport).");
        } else if ((res as any)?.error) {
          setMessage(`Gagal mengirim magic link: ${(res as any).error}`);
        } else {
          setMessage("Permintaan dikirim. Periksa email Anda.");
        }
      }
    } catch (err: any) {
      setMessage(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
    // signIn will redirect to provider flow
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 rounded-md border bg-card">
        <h1 className="text-2xl font-semibold mb-4">Masuk ke Kios POS</h1>

  <form onSubmit={onEmailSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password (opsional)</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim magic link"}
            </Button>
            <Button variant="outline" type="button" onClick={() => router.push("/")}>Batal</Button>
          </div>
        </form>

        {/* credentials only - no magic link / providers */}

        {message ? (
          <div className="mt-4 text-sm text-muted-foreground">{message}</div>
        ) : null}
      </div>
    </div>
  );
}
