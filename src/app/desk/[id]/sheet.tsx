"use client";

import { useState, useTransition } from "react";
import { recordAnswer, refreshMarket, sendOffer } from "@/app/actions";
import type { Status } from "@/db/schema";
import { cad, signed, worksheet, type DeskInputs } from "@/lib/valuation";

const digits = (s: string) => Number(s.replace(/[^\d]/g, "").slice(0, 7)) || 0;

/**
 * The desk's worksheet, as a ledger: retail anchor, kilometres,
 * reconditioning, pack and gross down to a suggested offer, then the
 * number the desk actually sends. Every line recomputes as you type; the
 * ledger keeps its shape, so nothing moves.
 */
export function DeskSheet(p: {
  id: string;
  status: Status;
  customerName: string;
  hasAccount: boolean;
  carKm: number;
  referenceKm: number;
  recon: number;
  inputs: DeskInputs;
  compsMedian: number | null;
  marketMedian: number | null;
  offer: number | null;
  note: string;
  estimate: [number, number] | null;
}) {
  const [inputs, setInputs] = useState<DeskInputs>(p.inputs);
  const ws = worksheet(inputs, p.carKm, p.referenceKm, p.recon);
  const [offer, setOffer] = useState<string>(String(p.offer ?? ws.offer));
  const [touched, setTouched] = useState(p.offer != null);
  const [note, setNote] = useState(p.note);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finalOffer = touched ? digits(offer) : ws.offer;
  const set = (k: keyof DeskInputs, v: number | string) => setInputs((i) => ({ ...i, [k]: v }));
  const closed = p.status === "accepted";

  return (
    <div className="slab overflow-hidden">
      <div className="border-b-2 border-ink px-4 py-3">
        <p className="display text-[1.75rem] uppercase">Appraisal sheet</p>
        <p className="text-[14px] text-muted">
          For {p.customerName}
          {p.estimate && <> · website said {cad(p.estimate[0])} to {cad(p.estimate[1])}</>}
        </p>
      </div>

      <div className="divide-y divide-rule px-4">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="label">Retail anchor</span>
            <Money value={inputs.anchor} onChange={(v) => setInputs((i) => ({ ...i, anchor: v, anchorSource: "manual" }))} disabled={closed} big />
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {p.compsMedian != null && (
              <button type="button" className={`link ${inputs.anchorSource === "comps" ? "text-ink" : ""}`} onClick={() => setInputs((i) => ({ ...i, anchor: p.compsMedian!, anchorSource: "comps" }))}>
                Comps median {cad(p.compsMedian)}
              </button>
            )}
            {p.compsMedian != null && p.marketMedian != null && " · "}
            {p.marketMedian != null && (
              <button type="button" className={`link ${inputs.anchorSource === "market" ? "text-ink" : ""}`} onClick={() => setInputs((i) => ({ ...i, anchor: p.marketMedian!, anchorSource: "market" }))}>
                Market median {cad(p.marketMedian)}
              </button>
            )}
          </p>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="label">Kilometres</span>
            <span className="num text-[1.375rem]">{signed(ws.kmAdj)}</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
            {p.carKm.toLocaleString("en-CA")} against {p.referenceKm.toLocaleString("en-CA")} at $
            <input
              value={String(inputs.perKm)}
              onChange={(e) => set("perKm", Number(e.target.value.replace(/[^\d.]/g, "").slice(0, 5)) || 0)}
              inputMode="decimal"
              disabled={closed}
              aria-label="Dollars per kilometre"
              className="h-7 w-14 border-2 border-ink bg-card px-1.5 text-[13px] text-ink"
            />
            a km
          </p>
        </div>

        <Line label="Reconditioning" hint="From the walk-around">
          <span className="num text-[1.375rem]">{signed(-ws.recon)}</span>
        </Line>
        <Line label="Pack" hint="Safety, detail, certification">
          <Money value={inputs.pack} onChange={(v) => set("pack", v)} minus disabled={closed} />
        </Line>
        <Line label="Target gross" hint="What the store makes on resale">
          <Money value={inputs.gross} onChange={(v) => set("gross", v)} minus disabled={closed} />
        </Line>
      </div>

      <div className="flex items-center justify-between gap-3 border-y-2 border-ink bg-spruce-soft px-4 py-3">
        <span className="label text-ink">Suggested offer</span>
        <span className="num text-[2rem] leading-none">{cad(ws.offer)}</span>
      </div>

      <div className="bg-spruce px-4 pb-4 pt-3 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-white/75">
            {p.status === "offered" ? "Offer out" : p.status === "accepted" ? "Accepted" : p.status === "declined" ? "Declined at" : "Final offer"}
          </span>
          {!touched || finalOffer === ws.offer ? null : (
            <button type="button" className="text-[13px] text-white/75 underline" onClick={() => (setTouched(false), setOffer(String(ws.offer)))}>
              Use suggested
            </button>
          )}
        </div>
        <label className="relative mt-1 block">
          <span className="num pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[2.25rem] text-pencil/70">$</span>
          <input
            value={(touched ? digits(offer) : ws.offer).toLocaleString("en-CA")}
            onChange={(e) => (setTouched(true), setOffer(e.target.value))}
            inputMode="numeric"
            disabled={closed}
            aria-label="Final offer"
            className="num h-16 w-full border-2 border-pencil bg-spruce-deep pl-9 pr-3 text-[2.75rem] text-pencil outline-none focus:outline-[3px] focus:outline-pencil disabled:opacity-80"
          />
        </label>
        {!closed && (
          <>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={`A line for ${p.customerName.split(" ")[0]}: what drove the number`}
              className="mt-3 w-full border-2 border-spruce-line bg-spruce-deep px-3 py-2 text-[15px] text-white placeholder:text-white/45"
            />
            <p className="min-h-[1.25rem] text-[13px] text-[#ffb59a]">{error}</p>
            <button
              type="button"
              className="btn btn-pencil w-full"
              disabled={pending || finalOffer <= 0}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await sendOffer(p.id, { offer: finalOffer, note, desk: inputs });
                  if (r?.error) setError(r.error);
                })
              }
            >
              {p.status === "desk" ? "Send offer" : "Send revised offer"}
            </button>
            {p.status === "offered" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" className="btn btn-sm border-2 border-white/60 text-white" disabled={pending} onClick={() => start(() => recordAnswer(p.id, "accepted"))}>
                  Accepted
                </button>
                <button type="button" className="btn btn-sm border-2 border-white/60 text-white" disabled={pending} onClick={() => start(() => recordAnswer(p.id, "declined"))}>
                  Declined
                </button>
              </div>
            )}
            <p className="mt-2 text-[13px] text-white/65">
              {p.hasAccount
                ? `${p.customerName.split(" ")[0]} sees the offer in their account and can accept it there.`
                : "Walk-in: no account, so record the answer here."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span>
        <span className="label block">{label}</span>
        <span className="text-[13px] text-muted">{hint}</span>
      </span>
      {children}
    </div>
  );
}

function Money({
  value,
  onChange,
  minus,
  big,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  minus?: boolean;
  big?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="relative block">
      <span className={`num pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted ${big ? "text-[1.375rem]" : "text-[1.125rem]"}`}>
        {minus ? "− $" : "$"}
      </span>
      <input
        value={value.toLocaleString("en-CA")}
        onChange={(e) => onChange(digits(e.target.value))}
        inputMode="numeric"
        disabled={disabled}
        className={`num border-2 border-ink bg-card pr-2.5 text-right ${minus ? "pl-10" : "pl-6"} ${big ? "h-12 w-[10rem] text-[1.5rem]" : "h-10 w-[8.5rem] text-[1.25rem]"}`}
      />
    </label>
  );
}

export function RefreshButton({ id, readAt }: { id: string; readAt: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="text-right">
      <button type="button" className="btn btn-line btn-sm" disabled={pending} onClick={() => start(() => refreshMarket(id))}>
        {pending ? "Reading…" : "Refresh market"}
      </button>
      <p className="mt-1 text-[13px] text-muted" suppressHydrationWarning>
        Read {new Date(readAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </p>
    </div>
  );
}
