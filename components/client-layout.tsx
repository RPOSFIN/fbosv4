"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/sidebar";
import AuthGuard from "@/components/auth-guard";
import { AuthProvider } from "@/hooks/use-auth";
import LogoutButton from "@/components/logout-button";
import { useAuth } from "@/hooks/use-auth";
import { isAuthDisabled } from "@/lib/auth/disabled";

const PUBLIC_PATHS = ["/login", "/unauthorized"];
const AUTH_FLOW_PATHS = ["/auth/callback"];

function AppShell({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session?.profile.role} />
      <div className="flex-1 flex flex-col">
        <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {session?.profile.full_name || session?.profile.email || "FBOS User"}
            {session?.profile.role && (
              <span className="ml-2 text-cyan-400 capitalize">
                {session.profile.role.replace("_", " ")}
              </span>
            )}
          </div>
          <LogoutButton />
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const authDisabled = isAuthDisabled();

  if (authDisabled && pathname === "/login") {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
    return null;
  }

  if (
    AUTH_FLOW_PATHS.some((p) => pathname.startsWith(p)) ||
    (!authDisabled && PUBLIC_PATHS.includes(pathname))
  ) {
    return <>{children}</>;
  }

  if (authDisabled) {
    return (
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AuthProvider>
  );
}
