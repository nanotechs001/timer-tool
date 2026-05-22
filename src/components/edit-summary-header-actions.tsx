"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  pdfUrl: string;
  viewPreviousHref: string;
};

export function EditSummaryHeaderActions({ pdfUrl, viewPreviousHref }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [action, setAction] = useState<"download" | "previous">("download");
  const [loading, setLoading] = useState(false);
  const [seenPreviousQuery, setSeenPreviousQuery] = useState(false);

  useEffect(() => {
    if (!loading) return;
    if (searchParams.get("view") === "previous") {
      setSeenPreviousQuery(true);
      return;
    }
    if (!seenPreviousQuery) return;
    setLoading(false);
    setSeenPreviousQuery(false);
  }, [loading, searchParams, seenPreviousQuery]);

  function onGo() {
    if (action === "download") {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setSeenPreviousQuery(false);
    setLoading(true);
    router.push(viewPreviousHref);
  }

  return (
    <div className="ml-auto inline-flex items-center gap-2">
      <select
        value={action}
        onChange={(e) => setAction(e.target.value as "download" | "previous")}
        disabled={loading}
        className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none focus:ring-2 focus:ring-brand/25 dark:border-zinc-700 dark:bg-surface dark:text-zinc-200"
      >
        <option value="download">Download PDF</option>
        <option value="previous">View previous report</option>
      </select>
      <button
        type="button"
        onClick={onGo}
        disabled={loading}
        className="inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {loading ? "Loading..." : "Go"}
      </button>
    </div>
  );
}
