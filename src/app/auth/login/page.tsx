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
  const router = useRouter();

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await signIn("email", { email, redirect: false });
      // next-auth returns an object when redirect: false
      // If email provider is configured to use jsonTransport, link will be logged to server console.
      if ((res as any)?.ok) {
        setMessage("Magic link dikirim ke email (cek konsol jika menggunakan jsonTransport).");
      } else if ((res as any)?.error) {
        setMessage(`Gagal mengirim magic link: ${(res as any).error}`);
      } else {
        setMessage("Permintaan dikirim. Periksa email Anda.");
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

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim magic link"}
            </Button>
            <Button variant="outline" type="button" onClick={() => router.push("/")}>Batal</Button>
          </div>
        </form>

        <div className="my-4 border-t pt-4">
          <p className="text-sm mb-2">Atau masuk pakai</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onGoogle} disabled={loading}>Google</Button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 text-sm text-muted-foreground">{message}</div>
        ) : null}
      </div>
    </div>
  );
}
