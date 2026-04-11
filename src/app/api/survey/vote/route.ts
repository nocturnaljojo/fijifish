import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as { fish_species_id?: unknown };
    const { fish_species_id } = body;

    if (typeof fish_species_id !== "string" || fish_species_id.trim() === "") {
      return NextResponse.json(
        { error: "fish_species_id is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

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
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 },
      );
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
  } catch (err) {
    console.error("[survey/vote] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
