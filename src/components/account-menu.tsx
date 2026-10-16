"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

const ROLE_LABEL = { customer: null, appraiser: "Appraiser", desk: "Desk" } as const;

export function AccountMenu({ name, role }: { name: string | null; role: "customer" | "appraiser" | "desk" | null }) {
  const router = useRouter();
  if (!name || !role) {
    return (
      <Link href="/sign-in" className="whitespace-nowrap font-display text-[1.0625rem] font-semibold uppercase tracking-[0.04em] text-white">
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 text-[14px]">
      <span className="hidden text-white/75 sm:inline">
        {name}
        {ROLE_LABEL[role] && <span className="text-pencil"> · {ROLE_LABEL[role]}</span>}
      </span>
      <button
        type="button"
        className="whitespace-nowrap font-display text-[1.0625rem] font-semibold uppercase tracking-[0.04em] text-white"
        onClick={async () => {
          await signOut();
          router.push("/sign-in");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </div>
  );
}
