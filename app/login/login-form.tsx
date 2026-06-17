"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSession } from "@/lib/api/client";
import { isAuthDisabled } from "@/lib/auth/disabled";
import { AUTH_NEXT_COOKIE } from "@/lib/auth/next-path";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function setAuthNextCookie(next: string) {
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=600; SameSite=Lax`;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const urlError = searchParams.get("error");

  useEffect(() => {
    if (isAuthDisabled()) {
      router.replace("/");
    }
  }, [router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "magic">("magic");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (urlError) {
      setMessage(decodeURIComponent(urlError.replace(/\+/g, " ")));
    }
  }, [urlError]);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await fetchSession();
      if (active && session) {
        router.replace(next);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, next]);

  async function handlePasswordLogin() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Login failed");

      router.replace(next);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    setLoading(true);
    setMessage("");

    setAuthNextCookie(next);

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;
    // Must match Supabase allowed redirect URL exactly — no query params
    const redirectTo = `${origin}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: true,
      },
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(
      "Magic link sent! Open email link in THIS SAME browser tab (not Gmail in-app browser). Request new link if expired."
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md border border-cyan-500 rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-1">FBOS Login</h1>
        <p className="text-sm text-slate-400 mb-6">
          Secure access with role-based permissions
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-slate-900 border border-slate-700 mb-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode === "login" && (
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded bg-slate-900 border border-slate-700 mb-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}

        {message && (
          <p className="text-sm mb-3 text-amber-300 whitespace-pre-wrap">{message}</p>
        )}

        <button
          disabled={loading || !email || (mode === "login" && !password)}
          onClick={mode === "login" ? handlePasswordLogin : handleMagicLink}
          className="w-full bg-cyan-600 p-3 rounded disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
              ? "Sign In"
              : "Send Magic Link"}
        </button>

        <button
          type="button"
          className="w-full mt-3 text-sm text-slate-400 hover:text-white"
          onClick={() => setMode(mode === "login" ? "magic" : "login")}
        >
          {mode === "login"
            ? "Use magic link instead"
            : "Use password instead"}
        </button>

        <p className="mt-4 text-xs text-slate-500">
          Supabase Dashboard → Auth → URL Configuration → Redirect URLs add:{" "}
          <code className="text-cyan-400">http://localhost:3000/api/auth/callback</code>
        </p>
      </div>
    </div>
  );
}
