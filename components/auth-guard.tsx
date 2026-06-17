"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthDisabled } from "@/lib/auth/disabled";
import { useAuth } from "@/hooks/use-auth";

const PUBLIC_PATHS = ["/login", "/unauthorized"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  if (isAuthDisabled()) {
    return <>{children}</>;
  }

  const { session, loading, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const retried = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (session || PUBLIC_PATHS.includes(pathname)) return;

    if (!retried.current) {
      retried.current = true;
      refresh();
      return;
    }

    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, session, pathname, router, refresh]);

  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (loading || (!session && !retried.current)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-3">
        <p>Loading FBOS...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Redirecting to login...
      </div>
    );
  }

  return <>{children}</>;
}
