"use client";

import { useState } from "react";
import { signIn, type SignInResponse } from "next-auth/react";
import { useRouter } from "next/navigation";

import { MotionButton as Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const router = useRouter();

  const onEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "password") {
        if (!password) {
          setMessage("Masukkan password Anda.");
          return;
        }
        // use credentials provider
        const res = (await signIn('credentials', { redirect: false, email, password })) as
          | SignInResponse
          | undefined;
        if (res?.error) {
          setMessage(`Gagal login: ${res.error}`);
        } else {
          // successful sign in will redirect automatically if redirect omitted in client
          window.location.href = '/';
        }
      } else {
        const res = (await signIn("email", { email, redirect: false })) as
          | SignInResponse
          | undefined;
        if (res?.ok) {
          setMessage("Magic link dikirim ke email (cek konsol jika menggunakan jsonTransport).");
        } else if (res?.error) {
          setMessage(`Gagal mengirim magic link: ${res.error}`);
        } else {
          setMessage("Permintaan dikirim. Periksa email Anda.");
        }
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | string | unknown;
      setMessage((e as { message?: string })?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6 rounded-md border bg-card">
        <h1 className="text-2xl font-semibold mb-4">Masuk ke Kios POS</h1>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === "magic" ? "default" : "outline"}
            onClick={() => {
              setMode("magic");
              setPassword("");
              setMessage(null);
            }}
          >
            Tautan Email
          </Button>
          <Button
            type="button"
            variant={mode === "password" ? "default" : "outline"}
            onClick={() => {
              setMode("password");
              setMessage(null);
            }}
          >
            Email + Password
          </Button>
        </div>

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

          {mode === "password" ? (
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={mode === "password"}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Kami akan mengirimkan tautan masuk sekali pakai ke email Anda.
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading
                ? "Memproses..."
                : mode === "magic"
                  ? "Kirim tautan masuk"
                  : "Masuk"}
            </Button>
            <Button variant="outline" type="button" onClick={() => router.push("/")}>Batal</Button>
          </div>
        </form>

        {/* credentials only - no magic link / providers */}

        {message ? (
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p>{message}</p>
            {mode === "magic" && !message.toLowerCase().includes("gagal") ? (
              <p className="text-xs">
                Kami kirim tautan ke email Anda. Cek folder Spam jika tidak menemukan dalam 1 menit.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
