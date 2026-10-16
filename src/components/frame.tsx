import Link from "next/link";
import { AppShell } from "@/kit/app-shell";
import { CardogCredit, LarkspurWordmark } from "@/brand/larkspur";
import { dataMode } from "@/lib/cardog";
import type { Viewer } from "@/lib/session";
import { AccountMenu } from "./account-menu";

/**
 * The Larkspur frame around every screen: the spruce bar with the store's
 * wordmark, the nav for whoever is signed in, and the developer pane.
 */
export function Frame({ me, sub, width, children }: { me: Viewer | null; sub?: string; width?: number; children: React.ReactNode }) {
  const nav =
    me?.role === "desk" ? (
      <>
        <NavLink href="/desk">Desk</NavLink>
        <NavLink href="/lot">Lot</NavLink>
        <NavLink href="/">Website</NavLink>
      </>
    ) : me?.role === "appraiser" ? (
      <>
        <NavLink href="/lot">Lot</NavLink>
        <NavLink href="/">Website</NavLink>
      </>
    ) : me ? (
      <>
        <NavLink href="/">Estimate</NavLink>
        <NavLink href="/trade">My trade</NavLink>
      </>
    ) : undefined;
  return (
    <AppShell
      mode={dataMode}
      width={width}
      brand={
        <Link href="/" aria-label="Larkspur Motors home">
          <LarkspurWordmark sub={sub} />
        </Link>
      }
      nav={nav}
      account={<AccountMenu name={me?.name ?? null} role={me?.role ?? null} />}
      footer={
        <div className="flex items-center justify-between border-t-2 border-ink pt-4 text-[13px] text-muted">
          <span className="font-display font-semibold uppercase tracking-[0.06em]">Larkspur Motors · Used cars and trade-ins</span>
          <CardogCredit />
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="shrink-0 hover:text-white">
      {children}
    </Link>
  );
}
