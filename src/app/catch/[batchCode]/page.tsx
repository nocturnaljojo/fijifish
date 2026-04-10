// Public catch traceability page — accessible via QR code on packaging.
// Anyone with the link can view the catch details for their order.
// Full page built in Session B when admin panel can create batches.

import { createPublicSupabaseClient } from "@/lib/supabase";

type Props = {
  params: Promise<{ batchCode: string }>;
};

export default async function CatchTracePage({ params }: Props) {
  const { batchCode } = await params;

  // Stub: attempt DB lookup, show batch code regardless
  let batchFound = false;
  try {
    const supabase = createPublicSupabaseClient();
    const { data } = await supabase
      .from("catch_batches")
      .select("id, batch_code, fisher_name, catch_date, catch_method")
      .eq("batch_code", batchCode.toUpperCase())
      .single();
    batchFound = !!data;
  } catch {
    // Not found — show stub
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
        {/* FijiFish logo mark */}
        <div className="text-5xl mb-6" aria-hidden="true">🐟</div>

        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 rounded-full border border-ocean-teal/20 bg-ocean-teal/5 text-ocean-teal text-xs font-mono tracking-widest uppercase">
          Catch Traceability
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {batchFound ? "Batch Found" : "Batch Details Coming Soon"}
        </h1>

        <p className="text-text-secondary text-sm mb-6 leading-relaxed">
          {batchFound
            ? "Full catch details — fisher, village, method, and journey — will appear here."
            : "This catch is being registered in our traceability system. Check back soon."}
        </p>

        <div className="inline-block px-4 py-2 rounded-lg bg-bg-tertiary border border-border-default">
          <span className="text-[10px] font-mono text-text-secondary uppercase tracking-widest block mb-1">
            Batch Code
          </span>
          <span className="font-mono font-bold text-ocean-teal text-lg">
            {batchCode.toUpperCase()}
          </span>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-text-secondary">
            Wild-caught in Fiji · Vacuum-sealed · Air-freighted to Australia
          </p>
          <a
            href="/"
            className="inline-block mt-3 text-xs text-ocean-teal hover:underline"
          >
            ← Back to FijiFish
          </a>
        </div>
      </div>
    </div>
  );
}
