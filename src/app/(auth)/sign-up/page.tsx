import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Create an account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="display text-[2.75rem] uppercase">Create an account</h1>
      <p className="mb-8 mt-2 text-[16px] text-ink-2">
        Your estimate, the appraisal and the desk&rsquo;s offer, all in one place.
      </p>
      <Suspense>
        <AuthForm kind="sign-up" />
      </Suspense>
    </>
  );
}
