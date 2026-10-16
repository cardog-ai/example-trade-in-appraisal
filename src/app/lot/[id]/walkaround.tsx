"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveWalkaround, sendToDesk, startWalkaround } from "@/app/actions";
import { CHECK_ITEMS, PHOTO_SLOTS, reconTotal, type Checklist } from "@/lib/trade-file";
import { cad } from "@/lib/valuation";

/**
 * The walk-around, built for one thumb in daylight: the odometer, thirteen
 * checks with a cost on each one that needs work, eight photo slots, and a
 * bar pinned to the bottom with the running reconditioning total. Every
 * change saves itself. Every row and slot has a fixed size, so tapping
 * never moves anything else.
 */
export function Walkaround({
  id,
  initial,
  photos,
}: {
  id: string;
  initial: { odometerKm: number | null; checklist: Checklist; lotNote: string };
  photos: Record<string, number>;
}) {
  const [odo, setOdo] = useState(initial.odometerKm ? initial.odometerKm.toLocaleString("en-CA") : "");
  const [list, setList] = useState<Checklist>(initial.checklist);
  const [note, setNote] = useState(initial.lotNote);
  const [shots, setShots] = useState<Record<string, number>>(photos);
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const first = useRef(true);

  const odoKm = Number(odo.replace(/[^\d]/g, "")) || null;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("saving");
    const t = setTimeout(async () => {
      const r = await saveWalkaround(id, { odometerKm: odoKm, checklist: list, lotNote: note }).catch(() => null);
      setSaved(r?.ok ? "saved" : "error");
    }, 500);
    return () => clearTimeout(t);
  }, [id, odoKm, list, note]);

  const set = (itemId: string, state: "ok" | "work") =>
    setList((l) => {
      const typical = CHECK_ITEMS.find((i) => i.id === itemId)?.typical ?? 0;
      const prev = l[itemId];
      return { ...l, [itemId]: { state, cost: state === "work" ? prev?.cost || typical : 0 } };
    });
  const setCost = (itemId: string, cost: number) => setList((l) => ({ ...l, [itemId]: { state: "work", cost } }));

  const checked = Object.values(list).filter((c) => c.state !== "unchecked").length;
  const recon = reconTotal(list);
  const areas = [...new Set(CHECK_ITEMS.map((i) => i.area))];

  return (
    <div className="pb-36">
      <label className="block">
        <span className="label">Odometer, as read on the dash</span>
        <input
          value={odo}
          onChange={(e) => {
            const n = e.target.value.replace(/[^\d]/g, "").slice(0, 7);
            setOdo(n ? Number(n).toLocaleString("en-CA") : "");
          }}
          className="field num mt-2 h-16 text-[2rem]"
          inputMode="numeric"
          placeholder="km"
        />
      </label>

      <div className="mt-8 space-y-8">
        {areas.map((area) => (
          <section key={area}>
            <h2 className="display border-b-2 border-ink pb-1.5 text-[1.5rem] uppercase">{area}</h2>
            <ul className="divide-y divide-rule">
              {CHECK_ITEMS.filter((i) => i.area === area).map((item) => {
                const c = list[item.id] ?? { state: "unchecked", cost: 0 };
                return (
                  <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_140px]">
                    <div className="min-w-0">
                      <p className="text-[1.0625rem] font-semibold leading-tight">{item.label}</p>
                      <p className="text-[13px] text-muted">Usually {cad(item.typical)} when it needs work</p>
                    </div>
                    <div className="flex" role="group" aria-label={item.label}>
                      <button
                        type="button"
                        aria-pressed={c.state === "ok"}
                        onClick={() => set(item.id, "ok")}
                        className={`h-12 w-[4.5rem] border-2 border-ink font-display text-[1.125rem] font-bold uppercase ${
                          c.state === "ok" ? "bg-spruce text-white" : "bg-card text-ink"
                        }`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        aria-pressed={c.state === "work"}
                        onClick={() => set(item.id, "work")}
                        className={`-ml-0.5 h-12 w-[4.5rem] border-2 border-ink font-display text-[1.125rem] font-bold uppercase ${
                          c.state === "work" ? "bg-flag text-white" : "bg-card text-ink"
                        }`}
                      >
                        Work
                      </button>
                    </div>
                    <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
                      <span className="text-[14px] text-muted sm:sr-only">Cost</span>
                      <span className="relative flex-1">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[1rem] text-muted">$</span>
                        <input
                          value={c.state === "work" ? String(c.cost) : ""}
                          disabled={c.state !== "work"}
                          onChange={(e) => setCost(item.id, Number(e.target.value.replace(/[^\d]/g, "").slice(0, 5)) || 0)}
                          inputMode="numeric"
                          aria-label={`${item.label} cost`}
                          className="field num h-12 pl-7 text-[1.25rem]"
                          placeholder="—"
                        />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="display border-b-2 border-ink pb-1.5 text-[1.5rem] uppercase">Photos</h2>
        <p className="mt-2 text-[14px] text-muted">Front, rear and odometer are needed to send it to the desk.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PHOTO_SLOTS.map((s) => (
            <li key={s.id}>
              <PhotoSlot
                id={id}
                slot={s.id}
                label={s.label}
                stamp={shots[s.id]}
                required={["front", "rear", "odometer"].includes(s.id)}
                onDone={(t) => setShots((x) => ({ ...x, [s.id]: t }))}
              />
            </li>
          ))}
        </ul>
      </section>

      <label className="mt-10 block">
        <span className="label">Note for the desk</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="field mt-2 h-auto py-3 text-[1rem]"
          placeholder="Aftermarket parts, smells, anything the photos miss"
        />
      </label>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-ink text-white lg:right-[420px]">
        <div className="mx-auto flex max-w-[760px] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white/60">
              Recon · {checked}/{CHECK_ITEMS.length} checked · {Object.keys(shots).length}/8 photos ·{" "}
              <span className="inline-block w-[4.5rem]">{saved === "saving" ? "saving" : saved === "error" ? "not saved" : "saved"}</span>
            </p>
            <p className="num text-[2rem] leading-none text-pencil">{cad(recon)}</p>
            <p className="min-h-[1.125rem] truncate text-[13px] text-[#ffb59a]">{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-pencil shrink-0"
            disabled={sending || saved === "saving"}
            onClick={() =>
              startSend(async () => {
                setError(null);
                const r = await sendToDesk(id);
                if (r?.error) setError(r.error);
              })
            }
          >
            Send to desk
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoSlot({
  id,
  slot,
  label,
  stamp,
  required,
  onDone,
}: {
  id: string;
  slot: string;
  label: string;
  stamp?: number;
  required: boolean;
  onDone: (t: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setBusy(true);
    setFailed(false);
    try {
      const blob = await shrink(file, 1600);
      const body = new FormData();
      body.set("slot", slot);
      body.set("file", blob, `${slot}.jpg`);
      const res = await fetch(`/api/appraisals/${id}/photos`, { method: "POST", body });
      if (!res.ok) throw new Error();
      onDone(Date.now());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className={`relative block aspect-[4/3] w-full overflow-hidden border-2 ${stamp ? "border-ink" : "border-dashed border-ink/50"} bg-card text-left`}
    >
      {stamp && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/appraisals/${id}/photos/${slot}?v=${stamp}`} alt={label} className="absolute inset-0 size-full object-cover" />
      )}
      <span
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 px-2 py-1.5 font-display text-[0.875rem] font-semibold uppercase tracking-[0.04em] ${
          stamp ? "bg-ink/80 text-white" : "text-ink"
        }`}
      >
        <span className="truncate">{label}</span>
        <span className={stamp ? "text-pencil" : required ? "text-flag" : "text-faint"}>
          {busy ? "…" : failed ? "Retry" : stamp ? "Retake" : required ? "Needed" : "Add"}
        </span>
      </span>
      {!stamp && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center pb-6 font-display text-[2.5rem] text-ink/30">
          +
        </span>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

/** Downscale on the phone before upload: a lot photo does not need 12 megapixels. */
async function shrink(file: File, max: number): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no()), "image/jpeg", 0.82));
  } catch {
    return file;
  }
}

export function StartButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn btn-go" disabled={pending} onClick={() => start(() => startWalkaround(id))}>
      Start walk-around
    </button>
  );
}
