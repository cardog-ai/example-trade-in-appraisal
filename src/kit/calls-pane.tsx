"use client";

/**
 * "What the app called": every Cardog SDK call behind the screen, with its
 * request, a trimmed response and its latency. A desktop column, or a
 * full-height sheet on a phone. Both are fixed in place, so opening,
 * closing or filling them never moves the page.
 */

import { useEffect, useRef, useState } from "react";
import type { CallRecord } from "@/lib/calls";
import { useCallLog } from "./call-log";

export function CallsPane({ className = "", onClose }: { className?: string; onClose?: () => void }) {
  const { calls, mode } = useCallLog();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [calls.length]);

  return (
    <section aria-label="What the app called" className={`flex h-full flex-col bg-pane text-pane-text ${className}`}>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-pane-rule px-5">
        <p className="text-[13px] font-medium tracking-[0.01em]">What the app called</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-pane-muted">
            {mode === "live" ? "live · api.cardog.app" : "fixtures · no key set"}
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-full border border-pane-rule px-3 font-mono text-[12px] text-pane-text"
            >
              Close
            </button>
          )}
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {calls.length === 0 ? (
          <Empty mode={mode} />
        ) : (
          <ol className="space-y-3">
            {calls.map((c, i) => (
              <CallCard key={c.id} call={c} open={i === calls.length - 1} />
            ))}
          </ol>
        )}
        <div ref={end} />
      </div>
      <footer className="shrink-0 border-t border-pane-rule px-5 py-3 font-mono text-[11px] leading-relaxed text-pane-muted">
        Every call runs on the server through <span className="text-pane-text">@cardog/api</span>. The key never reaches
        the browser. See <span className="text-pane-text">src/lib/cardog.ts</span>.
      </footer>
    </section>
  );
}

function Empty({ mode }: { mode: "live" | "fixture" }) {
  return (
    <div className="px-1 pt-2 font-mono text-[12px] leading-relaxed text-pane-muted">
      <p>No calls yet on this screen.</p>
      <p className="mt-3">
        {mode === "fixture"
          ? "Fixture mode: responses held for three sample VINs are served with the latency they were read at. Set CARDOG_API_KEY to call the API."
          : "Calls appear here as the screen makes them."}
      </p>
    </div>
  );
}

function CallCard({ call, open }: { call: CallRecord; open: boolean }) {
  return (
    <li className="rounded-[4px] border border-pane-rule bg-pane-2">
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[11px] text-pane-muted">{call.step}</p>
            <p className="mt-1 truncate font-mono text-[12.5px] text-pane-text">
              {call.method}
              <span className="text-pane-muted">(…)</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5 font-mono text-[11px] tabular-nums">
            <span className={call.ok ? "text-pane-str" : "text-[#ff8f8f]"}>{call.status ?? "—"}</span>
            <span className="inline-block w-[52px] text-right text-pane-muted">{call.ms} ms</span>
          </div>
        </summary>
        <div className="space-y-3 border-t border-pane-rule px-3.5 pb-3.5 pt-3">
          <Row label="Request">
            <code className="block font-mono text-[12px] text-pane-text">{call.http}</code>
            <code className="mt-1 block font-mono text-[12px] text-pane-muted">
              await {call.method}({call.args.map((a) => JSON.stringify(a)).join(", ")})
            </code>
          </Row>
          <Row label="Returns">
            <p className="text-[12px] text-pane-text">{call.returns}</p>
          </Row>
          <Row label={call.mode === "live" ? "Response" : `Response · fixture, ${call.provenance ?? "recorded"}`}>
            <Json value={call.response} />
          </Row>
        </div>
      </details>
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-pane-muted">{label}</p>
      {children}
    </div>
  );
}

/** JSON, coloured by token. No dependency. */
export function Json({ value, className = "" }: { value: unknown; className?: string }) {
  const text = JSON.stringify(value, null, 2) ?? "null";
  const parts = text.split(/("(?:\\.|[^"\\])*"(?:\s*:)?|\b-?\d+(?:\.\d+)?\b|\btrue\b|\bfalse\b|\bnull\b)/g);
  return (
    <pre
      className={`max-h-[360px] overflow-auto rounded-[3px] bg-pane px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] text-pane-text ${className}`}
    >
      {parts.map((p, i) => {
        if (!p) return null;
        if (p.startsWith('"')) {
          return p.endsWith(":") ? (
            <span key={i} className="text-pane-key">
              {p}
            </span>
          ) : (
            <span key={i} className="text-pane-str">
              {p}
            </span>
          );
        }
        if (/^-?\d/.test(p))
          return (
            <span key={i} className="text-pane-num">
              {p}
            </span>
          );
        if (p === "true" || p === "false" || p === "null")
          return (
            <span key={i} className="text-pane-muted">
              {p}
            </span>
          );
        return <span key={i}>{p}</span>;
      })}
    </pre>
  );
}

/** The phone's way in: a pill in the header that opens the pane as a sheet. */
export function CallsSheetToggle() {
  const { calls } = useCallLog();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[4px] bg-spruce-deep px-2.5 font-mono text-[12px] text-white lg:hidden"
      >
        API calls
        <span className="inline-block min-w-[2ch] text-right tabular-nums text-pencil">{calls.length}</span>
      </button>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-150 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
        <div className="absolute inset-x-0 bottom-0 top-10 overflow-hidden rounded-t-[8px]">
          <CallsPane onClose={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
