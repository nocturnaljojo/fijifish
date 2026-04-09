import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

const VALID_TYPES = [
  "general",
  "delivery",
  "quality",
  "pricing",
  "species_request",
  "website",
] as const;
type FeedbackType = (typeof VALID_TYPES)[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      feedback_type?: unknown;
      message?: unknown;
      rating?: unknown;
      clerk_id?: unknown;
    };

    const { feedback_type, message, rating, clerk_id } = body;

    if (
      typeof feedback_type !== "string" ||
      !(VALID_TYPES as readonly string[]).includes(feedback_type)
    ) {
      return NextResponse.json(
        { error: `feedback_type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    if (typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json(
        { error: "message must be at least 3 characters" },
        { status: 400 },
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: "message must be 2000 characters or fewer" },
        { status: 400 },
      );
    }

    if (
      rating !== undefined &&
      rating !== null &&
      (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      return NextResponse.json(
        { error: "rating must be an integer between 1 and 5" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from("customer_feedback").insert({
      customer_clerk_id: typeof clerk_id === "string" ? clerk_id : null,
      feedback_type: feedback_type as FeedbackType,
      message: message.trim(),
      rating: typeof rating === "number" ? rating : null,
    });

    if (error) {
      console.error("[feedback] insert error:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
