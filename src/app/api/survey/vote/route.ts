import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      fish_species_id?: unknown;
      session_id?: unknown;
      clerk_id?: unknown;
    };

    const { fish_species_id, session_id, clerk_id } = body;

    if (
      typeof fish_species_id !== "string" ||
      fish_species_id.trim() === ""
    ) {
      return NextResponse.json(
        { error: "fish_species_id is required" },
        { status: 400 },
      );
    }

    if (
      (session_id !== undefined && typeof session_id !== "string") ||
      (clerk_id !== undefined && typeof clerk_id !== "string")
    ) {
      return NextResponse.json(
        { error: "Invalid session_id or clerk_id" },
        { status: 400 },
      );
    }

    if (!clerk_id && !session_id) {
      return NextResponse.json(
        { error: "Provide either clerk_id or session_id" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from("fish_interest_votes").insert({
      fish_species_id,
      voter_clerk_id: clerk_id ?? null,
      voter_session_id: session_id ?? null,
    });

    if (error) {
      // Unique constraint = already voted — treat as success
      if (error.code === "23505") {
        return NextResponse.json({ already_voted: true });
      }
      console.error("[survey/vote] insert error:", error);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[survey/vote] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
