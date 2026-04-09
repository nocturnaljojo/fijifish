import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase";

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      postcode?: unknown;
      suburb?: unknown;
      state?: unknown;
      fish_species_id?: unknown;
    };

    const { postcode, suburb, fish_species_id } = body;

    if (typeof postcode !== "string" || !/^\d{4}$/.test(postcode.trim())) {
      return NextResponse.json(
        { error: "postcode must be a 4-digit Australian postcode" },
        { status: 400 },
      );
    }

    if (
      typeof suburb !== "string" ||
      suburb.trim().length < 2 ||
      suburb.trim().length > 100
    ) {
      return NextResponse.json(
        { error: "suburb is required (2–100 chars)" },
        { status: 400 },
      );
    }

    if (
      fish_species_id !== undefined &&
      fish_species_id !== null &&
      typeof fish_species_id !== "string"
    ) {
      return NextResponse.json(
        { error: "fish_species_id must be a UUID string or omitted" },
        { status: 400 },
      );
    }

    const derivedState =
      typeof body.state === "string" && (AU_STATES as readonly string[]).includes(body.state)
        ? (body.state as AuState)
        : deriveState(postcode.trim());

    if (!derivedState) {
      return NextResponse.json(
        { error: "Could not determine Australian state from postcode" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

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
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, state: derivedState });
  } catch (err) {
    console.error("[delivery-demand/vote] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("delivery_demand_summary")
      .select("postcode, suburb, state, unique_voters, total_votes")
      .limit(5);

    if (error || !data) return NextResponse.json({ leaderboard: [] });
    return NextResponse.json({ leaderboard: data });
  } catch {
    return NextResponse.json({ leaderboard: [] });
  }
}
