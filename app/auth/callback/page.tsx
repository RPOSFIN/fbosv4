"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Completing login...");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createSupabaseBrowserClient();
      const next = searchParams.get("next") || "/";
      const code = searchParams.get("code");
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const oauthError =
        searchParams.get("error_description") || searchParams.get("error");

      if (oauthError && !code && !tokenHash) {
        router.replace(
          `/login?error=${encodeURIComponent(oauthError.replace(/\+/g, " "))}`
        );
        return;
      }

      // Implicit flow: Supabase may redirect with #access_token=...
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        setStatus("Setting session from link...");
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (cancelled) return;
          if (error) {
            router.replace(`/login?error=${encodeURIComponent(error.message)}`);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
          router.replace(next);
          router.refresh();
          return;
        }
      }

      if (code) {
        setStatus("Verifying login code...");
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          const msg = error.message.includes("PKCE")
            ? "Link opened in different browser. Request a NEW magic link and open it in the SAME browser tab where you requested it."
            : error.message;
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      if (tokenHash && type) {
        setStatus("Verifying email link...");
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
        if (cancelled) return;
        if (error) {
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
        router.replace(next);
        router.refresh();
        return;
      }

      router.replace(
        `/login?error=${encodeURIComponent("Invalid or expired login link. Request a new magic link.")}`
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
      {status}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
          Loading...
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
