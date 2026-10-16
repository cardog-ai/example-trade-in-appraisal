"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth-client";

export function AuthForm({ kind }: { kind: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const carry = safeNext ? `?next=${encodeURIComponent(safeNext)}` : "";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const res =
      kind === "sign-up"
        ? await signUp.email({ email, password, name: String(f.get("name") ?? "").trim() || email.split("@")[0] })
        : await signIn.email({ email, password });
    if (res.error) {
      setError(res.error.message ?? "That didn't work. Try again.");
      setBusy(false);
      return;
    }
    // /home sends each role to its own screen.
    router.push(safeNext ?? "/home");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {kind === "sign-up" && (
        <label className="block">
          <span className="label">Full name</span>
          <input name="name" className="field mt-2" autoComplete="name" required />
        </label>
      )}
      <label className="block">
        <span className="label">Email</span>
        <input name="email" type="email" className="field mt-2" autoComplete="email" required />
      </label>
      <label className="block">
        <span className="label">Password</span>
        <input
          name="password"
          type="password"
          className="field mt-2"
          autoComplete={kind === "sign-up" ? "new-password" : "current-password"}
          minLength={8}
          required
        />
      </label>
      <p role="alert" className="min-h-[1.25rem] text-[14px] text-flag">
        {error}
      </p>
      <button type="submit" className="btn btn-go w-full" disabled={busy}>
        {kind === "sign-up" ? "Create account" : "Sign in"}
      </button>
      <p className="pt-1 text-center text-[15px] text-muted">
        {kind === "sign-up" ? (
          <>
            Already have an account?{" "}
            <Link href={`/sign-in${carry}`} className="link text-ink">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Trading in a car?{" "}
            <Link href={`/sign-up${carry}`} className="link text-ink">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
