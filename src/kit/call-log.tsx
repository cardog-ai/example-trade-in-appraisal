"use client";

/**
 * The call log, browser side. Self-contained: lift this folder into the
 * next sample app unchanged.
 *
 *   <CallLogProvider mode="live">          once, in the signed-in layout
 *   useCallLog().add(records)              after a route handler answers
 *   <ShowCalls calls={records} />          from a server page, to replace the log
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CallRecord } from "@/lib/calls";

interface Log {
  calls: CallRecord[];
  mode: "live" | "fixture";
  add: (c: CallRecord[]) => void;
  replace: (c: CallRecord[]) => void;
  clear: () => void;
}

const Ctx = createContext<Log | null>(null);

export function CallLogProvider({ mode, children }: { mode: "live" | "fixture"; children: React.ReactNode }) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const add = useCallback((c: CallRecord[]) => setCalls((prev) => [...prev, ...c]), []);
  const replace = useCallback((c: CallRecord[]) => setCalls(c), []);
  const clear = useCallback(() => setCalls([]), []);
  const value = useMemo(() => ({ calls, mode, add, replace, clear }), [calls, mode, add, replace, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCallLog(): Log {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCallLog needs a <CallLogProvider>");
  return v;
}

/** Replace the log with calls a server page made (or stored). */
export function ShowCalls({ calls }: { calls: CallRecord[] }) {
  const { replace } = useCallLog();
  const key = calls.map((c) => c.id).join(",");
  useEffect(() => {
    replace(calls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, replace]);
  return null;
}
