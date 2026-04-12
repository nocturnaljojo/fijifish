import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, requireAuth, errorResponse } from "@/lib/api-helpers";
import { createPublicSupabaseClient } from "@/lib/supabase";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"] as const;
type AuState = (typeof AU_STATES)[number];

function deriveState(postcode: string): AuState | "" {
  const pc = parseInt(postcode, 10);
  if (isNaN(pc)) return "";
  if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return "ACT";
  if (pc >= 2000 && pc <= 2999) return "NSW";
  if (pc >= 3000 && pc <= 3999) return "VIC";
  if (pc >= 4000 && pc <= 4999) return "QLD";
  if (pc >= 5000 && pc <= 5999) return "SA";
  if (pc >= 6000 && pc <= 6999) return "WA";
  if (pc >= 7000 && pc <= 7999) return "TAS";
  if (pc >= 800 && pc <= 999) return "NT";
  return "";
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { userId } = await requireAuth();

  const body = (await req.json()) as {
    postcode?: unknown;
    suburb?: unknown;
    state?: unknown;
    fish_species_id?: unknown;
  };

  const { postcode, suburb, fish_species_id } = body;

  if (typeof postcode !== "string" || !/^\d{4}$/.test(postcode.trim())) {
    return errorResponse("postcode must be a 4-digit Australian postcode", 400);
  }

  if (
    typeof suburb !== "string" ||
    suburb.trim().length < 2 ||
    suburb.trim().length > 100
  ) {
    return errorResponse("suburb is required (2–100 chars)", 400);
  }

  if (
    fish_species_id !== undefined &&
    fish_species_id !== null &&
    typeof fish_species_id !== "string"
  ) {
    return errorResponse("fish_species_id must be a UUID string or omitted", 400);
  }

  const derivedState =
    typeof body.state === "string" && (AU_STATES as readonly string[]).includes(body.state)
      ? (body.state as AuState)
      : deriveState(postcode.trim());

  if (!derivedState) {
    return errorResponse("Could not determine Australian state from postcode", 400);
  }

  const supabase = createPublicSupabaseClient();

  const { error } = await supabase.from("delivery_demand_votes").insert({
    voter_clerk_id: userId,
    postcode: postcode.trim(),
    suburb: suburb.trim(),
    state: derivedState,
    fish_species_id:
      typeof fish_species_id === "string" ? fish_species_id : null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ already_voted: true });
    }
    console.error("[delivery-demand/vote] insert error:", error);
    return errorResponse("Failed to record vote", 500);
  }

  return NextResponse.json({ success: true, state: derivedState });
});

export const GET = withErrorHandling(async () => {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("delivery_demand_summary")
    .select("postcode, suburb, state, unique_voters, total_votes")
    .limit(5);

  if (error || !data) return NextResponse.json({ leaderboard: [] });
  return NextResponse.json({ leaderboard: data });
});
