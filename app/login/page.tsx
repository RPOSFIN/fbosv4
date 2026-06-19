import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isAuthDisabled } from "@/lib/auth/disabled";
import LoginForm from "./login-form";

export default function LoginPage() {
  if (isAuthDisabled()) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-400">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
