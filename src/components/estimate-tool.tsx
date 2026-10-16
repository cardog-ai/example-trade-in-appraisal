"use client";

import Link from "next/link";
import { useState } from "react";
import { useCallLog } from "@/kit/call-log";
import type { CallRecord } from "@/lib/calls";
import type { TradeFacts } from "@/lib/trade-file";
import { CONDITIONS, cad, km as fmtKm, signed, typicalKm, type Condition, type Estimate } from "@/lib/valuation";
import { checkVin, normalizeVin } from "@/lib/vin";
import { ConditionPicker } from "./condition-picker";

type Answer = { facts: TradeFacts | null; estimate: Estimate | null; calls: CallRecord[]; error: string | null };

/**
 * The website's estimate: three answers on the left, the number on the
 * right. The result panel holds its height in every state, so nothing on
 * the page moves when the estimate arrives.
 */
export function EstimateTool({
  samples,
  canBook,
  initialError,
}: {
  samples: { vin: string; label: string; km: number }[];
  canBook: boolean;
  initialError: string | null;
}) {
  const log = useCallLog();
  const [vin, setVin] = useState("");
  const [kmText, setKmText] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(
    initialError ? { facts: null, estimate: null, calls: [], error: initialError } : null
  );
  const [asked, setAsked] = useState<{ vin: string; km: number; condition: Condition } | null>(null);

  const check = checkVin(vin);
  const kmValue = Number(kmText.replace(/[^\d]/g, ""));
  const ready = vin.length === 17 && check.state !== "invalid" && kmValue > 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    const q = { vin, km: kmValue, condition };
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(q),
      });
      const data = (await res.json()) as Partial<Answer>;
      log.add(data.calls ?? []);
      setAnswer({
        facts: data.facts ?? null,
        estimate: data.estimate ?? null,
        calls: data.calls ?? [],
        error: data.error ?? null,
      });
      setAsked(q);
    } catch {
      setAnswer({ facts: null, estimate: null, calls: [], error: "We could not reach the store. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
      <form onSubmit={submit} className="slab p-4 sm:p-6" noValidate>
        <label className="block">
          <span className="label">1 · VIN</span>
          <input
            value={vin}
            onChange={(e) => setVin(normalizeVin(e.target.value))}
            className="field field-vin mt-2"
            placeholder="17 characters"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            aria-describedby="vin-state"
          />
        </label>
        <p id="vin-state" className={`mt-2 min-h-[1.25rem] text-[14px] ${check.state === "invalid" ? "text-flag" : "text-muted"}`}>
          {check.state === "empty" && "On the dashboard through the windshield, or the driver's door jamb."}
          {check.state === "typing" && `${check.remaining} more`}
          {(check.state === "invalid" || check.state === "check-mismatch" || check.state === "ok") && check.message}
        </p>
        {samples.length > 0 && (
          <div className="mt-1 text-[14px] text-muted">
            <span>Sample VINs: </span>
            {samples.map((s, i) => (
              <span key={s.vin}>
                <button
                  type="button"
                  className="link text-ink"
                  onClick={() => {
                    setVin(s.vin);
                    setKmText(s.km.toLocaleString("en-CA"));
                  }}
                >
                  {s.label}
                </button>
                {i < samples.length - 1 && <span aria-hidden> · </span>}
              </span>
            ))}
          </div>
        )}

        <label className="mt-6 block">
          <span className="label">2 · Kilometres</span>
          <input
            value={kmText}
            onChange={(e) => {
              const n = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
              setKmText(n ? Number(n).toLocaleString("en-CA") : "");
            }}
            className="field mt-2 num text-[1.5rem]"
            placeholder="On the odometer"
            inputMode="numeric"
            autoComplete="off"
          />
        </label>

        <fieldset className="mt-6">
          <legend className="label">3 · Condition</legend>
          <ConditionPicker value={condition} onChange={setCondition} name="condition" />
        </fieldset>

        <button type="submit" className="btn btn-go mt-6 w-full" disabled={!ready}>
          {busy ? "Reading the market…" : "Get my estimate"}
        </button>
      </form>

      <Result answer={answer} asked={asked} busy={busy} canBook={canBook} />
    </div>
  );
}

function Result({
  answer,
  asked,
  busy,
  canBook,
}: {
  answer: Answer | null;
  asked: { vin: string; km: number; condition: Condition } | null;
  busy: boolean;
  canBook: boolean;
}) {
  const f = answer?.facts;
  const e = answer?.estimate;
  const showing = !busy && f && e && asked;

  return (
    <section aria-live="polite" className="slab flex min-h-[560px] flex-col overflow-hidden">
      {showing ? (
        <>
          <div className="bg-spruce px-4 pb-6 pt-5 text-white sm:px-6">
            <p className="font-display text-[0.875rem] font-semibold uppercase tracking-[0.1em] text-white/70">Your trade, today</p>
            <p className="display mt-1 text-[1.75rem] uppercase">
              {[f.year, f.make, f.model].filter(Boolean).join(" ")} {f.trim && <span className="text-white/70">{f.trim}</span>}
            </p>
            <p className="num mt-4 text-[2.75rem] leading-none text-pencil sm:text-[3.5rem]">
              {cad(e.low)} <span className="text-white/60">to</span> {cad(e.high)}
            </p>
            <p className="mt-3 text-[14px] text-white/75">
              From {f.market?.liveCount ?? "the"} live listings of this model year in Canada
              {f.market?.asOf && <>, as of {new Date(f.market.asOf).toLocaleDateString("en-CA", { month: "long", day: "numeric" })}</>}.
            </p>
          </div>
          <dl className="flex-1 divide-y divide-rule px-4 sm:px-6">
            <Line label="Asking prices, middle half" value={`${cad(e.basis.p25)} to ${cad(e.basis.p75)}`} />
            <Line
              label={`${fmtKm(asked.km)} against a typical ${fmtKm(typicalKm(f.year ?? new Date().getFullYear()))}`}
              value={signed(e.basis.kmAdj)}
            />
            <Line
              label={`${CONDITIONS.find((c) => c.id === asked.condition)?.label} condition: reconditioning`}
              value={signed(-e.basis.recon)}
            />
            <Line label="Safety, detail and the store's margin" value={signed(-(e.basis.pack + e.basis.gross))} />
          </dl>
          <div className="border-t-2 border-ink px-4 py-4 sm:px-6">
            {canBook ? (
              <Link
                href={`/trade/book?vin=${asked.vin}&km=${asked.km}&condition=${asked.condition}`}
                className="btn btn-pencil w-full"
              >
                Book my appraisal
              </Link>
            ) : (
              <p className="text-[14px] text-muted">Signed in as staff: start this car as a walk-in from the Lot.</p>
            )}
            <p className="mt-2 text-[14px] text-muted">Ten minutes on our lot, no obligation. The estimate is a range; the offer is firm.</p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-6">
          <div>
            <p className="label">{busy ? "Working" : answer?.error ? "Estimate" : "How it works"}</p>
            {busy ? (
              <p className="display mt-3 text-[2rem] uppercase text-muted">Reading the market…</p>
            ) : answer?.error ? (
              <p role="alert" className="mt-3 text-[1.125rem] leading-snug text-flag">
                {answer.error}
              </p>
            ) : (
              <ol className="mt-4 space-y-5">
                {[
                  ["Estimate online", "A range from live asking prices for your model year, adjusted for kilometres and condition."],
                  ["Walk-around", "An appraiser checks it over and takes photos. About ten minutes."],
                  ["Firm offer", "Our desk sets the number. It shows up in your account."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="num flex size-11 shrink-0 items-center justify-center bg-ink text-[1.5rem] text-pencil">{i + 1}</span>
                    <span>
                      <span className="display block text-[1.5rem] uppercase">{t}</span>
                      <span className="text-[15px] text-ink-2">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="mt-6 border-t border-rule pt-4 text-[14px] text-muted">Your estimate shows up here.</p>
        </div>
      )}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-[15px] text-ink-2">{label}</dt>
      <dd className="num shrink-0 text-[1.25rem]">{value}</dd>
    </div>
  );
}
