import Link from "next/link";
import { notFound } from "next/navigation";
import { Frame } from "@/components/frame";
import { History, Section, StatusTrack, VehicleTitle, when } from "@/components/bits";
import { ShowCalls } from "@/kit/call-log";
import { eventsFor, getAppraisal, logEvent, photosFor, updateAppraisal } from "@/lib/appraisals";
import { dataMode } from "@/lib/cardog";
import { readForDesk } from "@/lib/reads";
import { requireRole } from "@/lib/session";
import { CHECK_ITEMS, PHOTO_SLOTS, STICKER_REASON, reconTotal, type TradeFacts } from "@/lib/trade-file";
import { CONDITIONS, cad, defaultDeskInputs, km } from "@/lib/valuation";
import { DeskSheet, RefreshButton } from "./sheet";

export const metadata = { title: "Appraisal sheet" };

export default async function DeskCar({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole("desk");
  const { id } = await params;
  let a = getAppraisal(id);
  if (!a) notFound();

  // The first time the desk opens a walked car, read the market for it.
  if (!a.comps && a.status !== "booked" && a.status !== "walking") {
    const read = await readForDesk(a.facts, a.odometerKm ?? a.declaredKm, "Desk sheet");
    updateAppraisal(id, { facts: read.facts, comps: read.comps, marketReadAt: new Date(), calls: { ...a.calls, desk: read.calls } });
    logEvent(id, me, "market", `Market read for the desk: ${read.comps?.rows.length ?? 0} comparable listings`);
    a = getAppraisal(id)!;
  }

  const f = a.facts;
  const comps = a.comps;
  const recon = reconTotal(a.checklist);
  const photos = photosFor(id);
  const work = CHECK_ITEMS.filter((i) => a.checklist[i.id]?.state === "work");
  const carKm = a.odometerKm ?? a.declaredKm;
  const inputs = a.desk ?? defaultDeskInputs(comps?.medianPrice ?? null, comps?.rows.length ?? 0, f.market?.median ?? null);
  const referenceKm = comps?.medianKm ?? carKm;
  const ready = a.status !== "booked" && a.status !== "walking";

  return (
    <Frame me={me} sub="Desk" width={1100}>
      <ShowCalls calls={[...(a.calls.estimate ?? []), ...(a.calls.desk ?? [])]} />
      <Link href="/desk" className="label hover:text-ink">
        ← The desk
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <VehicleTitle a={a} />
        {ready && <RefreshButton id={a.id} readAt={a.marketReadAt.toISOString()} />}
      </div>
      <div className="mt-5 max-w-[640px]">
        <StatusTrack status={a.status} />
      </div>

      {!ready ? (
        <p className="slab mt-8 p-5 text-[1.0625rem]">
          This car is still on the lot. The sheet opens when the appraiser sends it over.{" "}
          <Link href={`/lot/${a.id}`} className="link">
            See the walk-around
          </Link>
        </p>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <DeskSheet
              id={a.id}
              status={a.status}
              customerName={a.customerName}
              hasAccount={!!a.customerId}
              carKm={carKm}
              referenceKm={referenceKm}
              recon={recon}
              inputs={inputs}
              compsMedian={comps && comps.rows.length >= 3 ? comps.medianPrice : null}
              marketMedian={f.market?.median ?? null}
              offer={a.offer}
              note={a.offerNote ?? ""}
              estimate={a.estimateLow != null ? [a.estimateLow, a.estimateHigh ?? a.estimateLow] : null}
            />
          </div>

          <div className="min-w-0 space-y-10">
            <Section title="On the lot" aside={a.walkedAt ? `walked ${when(a.walkedAt)}` : undefined}>
              <dl className="grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-4">
                <Cell k="Odometer" v={km(a.odometerKm)} sub={`said ${km(a.declaredKm)}`} />
                <Cell k="Customer said" v={CONDITIONS.find((c) => c.id === a.declaredCondition)?.label ?? "—"} />
                <Cell k="Needs work" v={`${work.length} of ${CHECK_ITEMS.length}`} />
                <Cell k="Reconditioning" v={cad(recon)} />
              </dl>
              {work.length > 0 && (
                <ul className="mt-3 divide-y divide-rule border-b border-rule">
                  {work.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 py-2 text-[15px]">
                      <span>
                        <span className="mr-2 inline-block size-2.5 bg-flag align-middle" aria-hidden />
                        {i.label}
                      </span>
                      <span className="num text-[1.125rem]">{cad(a.checklist[i.id].cost)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {a.lotNote && <p className="mt-3 border-l-4 border-pencil pl-3 text-[15px] text-ink-2">{a.lotNote}</p>}
              {photos.length > 0 && (
                <ul className="mt-4 grid grid-cols-4 gap-2">
                  {PHOTO_SLOTS.filter((s) => photos.some((p) => p.slot === s.id)).map((s) => {
                    const p = photos.find((x) => x.slot === s.id)!;
                    return (
                      <li key={s.id}>
                        <a href={`/api/appraisals/${a.id}/photos/${s.id}?v=${p.updatedAt.getTime()}`} target="_blank" rel="noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`/api/appraisals/${a.id}/photos/${s.id}?v=${p.updatedAt.getTime()}`}
                            alt={s.label}
                            className="aspect-[4/3] w-full border-2 border-ink object-cover"
                          />
                          <span className="mt-1 block truncate text-[12px] text-muted">{s.label}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Market f={f} />

            <Section
              title="Comparable listings"
              aside={comps ? `${comps.rows.length} ${comps.near} · ${f.year ? `${f.year - 1}–${f.year + 1}` : ""}` : undefined}
            >
              {!comps || comps.rows.length === 0 ? (
                <p className="text-[15px] text-muted">No live listings of this model within a year and 40,000 km. Price it from the market.</p>
              ) : (
                <>
                  <table className="w-full text-left text-[15px]">
                    <thead>
                      <tr className="label">
                        <th className="pb-2 font-semibold">Year · trim</th>
                        <th className="pb-2 text-right font-semibold">Km</th>
                        <th className="pb-2 text-right font-semibold">Asking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule border-y-2 border-ink">
                      {comps.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="py-2 pr-2">
                            <span className="font-semibold">{r.year}</span> <span className="text-ink-2">{r.trim ?? r.model}</span>
                          </td>
                          <td className={`py-2 text-right tabular-nums ${r.km != null && r.km < carKm ? "text-muted" : ""}`}>
                            {r.km != null ? r.km.toLocaleString("en-CA") : "—"}
                          </td>
                          <td className="num py-2 text-right text-[1.125rem]">{cad(r.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="pt-2 font-semibold">Median</td>
                        <td className="pt-2 text-right tabular-nums">{comps.medianKm?.toLocaleString("en-CA") ?? "—"}</td>
                        <td className="num pt-2 text-right text-[1.25rem]">{cad(comps.medianPrice)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  {dataMode === "fixture" && (
                    <p className="mt-2 text-[13px] text-muted">Fixture mode: these were read Canada-wide. Live mode searches around the store.</p>
                  )}
                </>
              )}
            </Section>

            <Sticker f={f} />

            <Section title="Recalls issued for this model and year">
              {!f.recalls ? (
                <p className="text-[15px] text-muted">Not read.</p>
              ) : (
                <>
                  <p className="text-[15px] text-ink-2">
                    {f.recalls.canada.length} from Transport Canada ({f.recalls.total} listed in all, Canada and the US). They are
                    matched by model year, not by this VIN; the manufacturer&rsquo;s own lookup says which apply to this car.
                  </p>
                  {f.recalls.canada.length > 0 && (
                    <ul className="mt-3 divide-y divide-rule border-y border-rule">
                      {f.recalls.canada.map((r) => (
                        <li key={r.ref} className="py-2.5">
                          <p className="text-[15px] font-semibold">
                            {r.component ?? "Campaign"} <span className="font-mono text-[13px] font-normal text-muted">TC {r.campaign} · {r.date}</span>
                          </p>
                          {r.summary && <p className="mt-0.5 text-[14px] leading-snug text-ink-2">{r.summary}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>

            <Section title="History">
              <History events={eventsFor(id)} />
            </Section>
          </div>
        </div>
      )}
    </Frame>
  );
}

function Cell({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="min-w-0 bg-card px-3 py-2.5">
      <dt className="label">{k}</dt>
      <dd className="num mt-0.5 truncate text-[1.375rem] leading-tight">{v}</dd>
      {sub && <dd className="truncate text-[13px] text-muted">{sub}</dd>}
    </div>
  );
}

/** The model year's asking prices as one bar: lowest, middle half, median. */
function Market({ f }: { f: TradeFacts }) {
  const m = f.market;
  return (
    <Section
      title="Market"
      aside={m?.asOf ? `${m.liveCount} live · ${new Date(m.asOf).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}` : undefined}
    >
      {!m || m.p25 == null || m.p75 == null || m.median == null ? (
        <p className="text-[15px] text-muted">No market quote for this model year.</p>
      ) : (
        <MarketBar best={m.best ?? m.p25} p25={m.p25} median={m.median} p75={m.p75} dom={m.avgDomDays} label={`${f.year} ${f.make} ${f.model}`} />
      )}
    </Section>
  );
}

function MarketBar({ best, p25, median, p75, dom, label }: { best: number; p25: number; median: number; p75: number; dom: number | null; label: string }) {
  const lo = Math.min(best, p25) * 0.95;
  const hi = p75 * 1.08;
  const x = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div>
      <p className="text-[15px] text-ink-2">Asking prices for every live {label} in Canada, all trims and kilometres.</p>
      <div className="relative mt-8 h-8 bg-rule">
        <span className="absolute inset-y-0 bg-spruce" style={{ left: x(p25), width: `calc(${x(p75)} - ${x(p25)})` }} />
        <span className="absolute -top-2 bottom-[-0.5rem] w-1 bg-pencil" style={{ left: x(median) }} />
        <span className="num absolute -top-7 -translate-x-1/2 text-[1.125rem]" style={{ left: x(median) }}>
          {cad(median)}
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[14px]">
        <span>
          <span className="label block">Lowest</span>
          <span className="num text-[1.125rem]">{cad(best)}</span>
        </span>
        <span className="text-center">
          <span className="label block">Middle half</span>
          <span className="num text-[1.125rem]">
            {cad(p25)} – {cad(p75)}
          </span>
        </span>
        <span className="text-right">
          <span className="label block">Days listed</span>
          <span className="num text-[1.125rem]">{dom ?? "—"}</span>
        </span>
      </div>
    </div>
  );
}

function Sticker({ f }: { f: TradeFacts }) {
  const s = f.sticker;
  const fresh = s?.held && s.downloadUrl && Date.now() - new Date(s.readAt).getTime() < 23 * 60 * 60 * 1000;
  return (
    <Section title="Window sticker">
      {!s ? (
        <p className="text-[15px] text-muted">Not read.</p>
      ) : s.held ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-card p-4">
          <div className="min-w-0">
            <p className="display text-[1.5rem] uppercase">Factory sticker on file</p>
            <p className="text-[14px] text-muted">
              From {s.issuer ? s.issuer[0].toUpperCase() + s.issuer.slice(1) : "the manufacturer"}
              {s.retrievedAt && `, ${new Date(s.retrievedAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}`}
              {s.vinVerified ? " · VIN read inside the document" : " · returned for this VIN by the manufacturer"}
            </p>
            {s.sha256 && <p className="mt-1 truncate font-mono text-[12px] text-faint">sha256 {s.sha256.slice(0, 16)}…</p>}
          </div>
          {fresh ? (
            <a href={s.downloadUrl!} target="_blank" rel="noreferrer" className="btn btn-line btn-sm">
              Open the sticker
            </a>
          ) : (
            <p className="max-w-[220px] text-[13px] text-muted">
              {dataMode === "fixture"
                ? "The 24-hour link is not kept in fixture mode. Set a key and refresh to open it."
                : "The link lasts 24 hours. Refresh the market for a new one."}
            </p>
          )}
        </div>
      ) : (
        <p className="text-[15px] text-ink-2">{STICKER_REASON[s.reason] ?? "None on file."}</p>
      )}
    </Section>
  );
}
