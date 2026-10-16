import Link from "next/link";
import { redirect } from "next/navigation";
import { CardogCredit, LarkspurWordmark } from "@/brand/larkspur";
import { HOME, getViewer } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const me = await getViewer();
  if (me) redirect(HOME[me.role]);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-spruce">
        <div className="mx-auto flex h-16 w-full max-w-[1080px] items-center px-4 sm:px-8">
          <Link href="/" aria-label="Larkspur Motors home">
            <LarkspurWordmark sub="Trade-in" />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 pb-16 pt-10 sm:pt-14">{children}</main>
      <footer className="mx-auto flex w-full max-w-[1080px] justify-end px-4 py-6 sm:px-8">
        <CardogCredit />
      </footer>
    </div>
  );
}
