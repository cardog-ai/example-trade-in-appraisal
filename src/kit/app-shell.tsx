/**
 * The frame: a header bar, the page, and the "What the app called" column
 * on desktop (a header pill and sheet on a phone).
 *
 * Brand-free on purpose: the brand, nav and user menu come in as slots,
 * and the colours come from the theme tokens in app/globals.css (`spruce`
 * for the bar, `pane-*` for the developer column), so the next sample app
 * can take this file unchanged and look like itself.
 */

import { CallLogProvider } from "./call-log";
import { CallsPane, CallsSheetToggle } from "./calls-pane";

export function AppShell({
  brand,
  nav,
  account,
  footer,
  mode,
  width = 960,
  children,
}: {
  brand: React.ReactNode;
  nav?: React.ReactNode;
  account?: React.ReactNode;
  footer?: React.ReactNode;
  mode: "live" | "fixture";
  /** The content column's max width, in px. */
  width?: number;
  children: React.ReactNode;
}) {
  const col = { maxWidth: width };
  return (
    <CallLogProvider mode={mode}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-h-dvh min-w-0 flex-col">
          <header className="sticky top-0 z-20 bg-spruce text-white">
            <div className="mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6" style={col}>
              <div className="flex min-w-0 items-center gap-8">
                {brand}
                {nav && (
                  <nav className="hidden items-center gap-6 font-display text-[1.0625rem] font-semibold uppercase tracking-[0.04em] text-white/75 md:flex">
                    {nav}
                  </nav>
                )}
              </div>
              <div className="flex items-center gap-3">
                <CallsSheetToggle />
                {account}
              </div>
            </div>
            {nav && (
              <nav
                className="mx-auto flex h-11 items-center gap-6 overflow-x-auto border-t border-spruce-line px-4 font-display text-[1.0625rem] font-semibold uppercase tracking-[0.04em] text-white/75 md:hidden"
                style={col}
              >
                {nav}
              </nav>
            )}
          </header>
          <main className="mx-auto w-full flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10" style={col}>
            {children}
          </main>
          {footer && (
            <footer className="mx-auto w-full px-4 pb-6 sm:px-6" style={col}>
              {footer}
            </footer>
          )}
        </div>
        <aside className="sticky top-0 hidden h-dvh lg:block">
          <CallsPane />
        </aside>
      </div>
    </CallLogProvider>
  );
}
