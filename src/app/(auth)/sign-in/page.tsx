import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="display text-[2.75rem] uppercase">Sign in</h1>
      <p className="mb-8 mt-2 text-[16px] text-ink-2">Customers see their trade and offer. Staff go to the lot or the desk.</p>
      <Suspense>
        <AuthForm kind="sign-in" />
      </Suspense>
    </>
  );
}
