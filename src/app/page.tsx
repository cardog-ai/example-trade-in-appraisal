import { Frame } from "@/components/frame";
import { EstimateTool } from "@/components/estimate-tool";
import { FIXTURE_VINS, dataMode } from "@/lib/cardog";
import { getViewer } from "@/lib/session";

export const metadata = { title: "What's your trade worth?" };

/** The store's website: the instant trade-in estimate. Public. */
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await getViewer();
  const sp = await searchParams;
  return (
    <Frame me={me} sub="Trade-in">
      <div className="max-w-[640px]">
        <h1 className="display text-[3rem] uppercase sm:text-[4.25rem]">What&rsquo;s your trade worth?</h1>
        <p className="mt-3 text-[1.125rem] leading-snug text-ink-2">
          VIN, kilometres, condition. An estimate in seconds, then a firm offer after a ten-minute walk-around on our lot.
        </p>
      </div>
      <EstimateTool
        samples={dataMode === "fixture" ? FIXTURE_VINS.map((v) => ({ ...v })) : []}
        canBook={!me || me.role === "customer"}
        initialError={sp.error === "decode" ? "That VIN did not decode. Check it and try again." : null}
      />
    </Frame>
  );
}
