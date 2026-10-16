"use client";

import { useTransition } from "react";
import { respondToOffer } from "@/app/actions";

export function OfferAnswer({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        className="btn btn-pencil w-full"
        disabled={pending}
        onClick={() => start(() => respondToOffer(id, "accepted"))}
      >
        Accept the offer
      </button>
      <button
        type="button"
        className="btn btn-line w-full"
        disabled={pending}
        onClick={() => start(() => respondToOffer(id, "declined"))}
      >
        No thanks
      </button>
    </div>
  );
}
