import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, requireAuth, errorResponse } from "@/lib/api-helpers";
import { createPublicSupabaseClient } from "@/lib/supabase";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { userId } = await requireAuth();

  const body = (await req.json()) as { fish_species_id?: unknown };
  const { fish_species_id } = body;

  if (typeof fish_species_id !== "string" || fish_species_id.trim() === "") {
    return errorResponse("fish_species_id is required", 400);
  }

  const supabase = createPublicSupabaseClient();

  const { error } = await supabase.from("fish_interest_votes").insert({
    fish_species_id,
    voter_clerk_id: userId,
    voter_session_id: null,
  });

  if (error) {
    if (error.code === "23505") {
      // Already voted — still return current count
      const { data: summary } = await supabase
        .from("fish_interest_summary")
        .select("vote_count")
        .eq("fish_species_id", fish_species_id)
        .maybeSingle();
      return NextResponse.json({
        already_voted: true,
        new_vote_count: summary?.vote_count ?? null,
      });
    }
    console.error("[survey/vote] insert error:", error);
    return errorResponse("Failed to record vote", 500);
  }

  // Return updated vote count so client can update UI without a refetch
  const { data: summary } = await supabase
    .from("fish_interest_summary")
    .select("vote_count")
    .eq("fish_species_id", fish_species_id)
    .maybeSingle();

  return NextResponse.json({
    success: true,
    new_vote_count: summary?.vote_count ?? null,
  });
});
