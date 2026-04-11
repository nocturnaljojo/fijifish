import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import {
  withErrorHandling,
  requireAdmin,
  successResponse,
  errorResponse,
} from "@/lib/api-helpers";

export const GET = withErrorHandling(async () => {
  await requireAdmin();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("impact_stories")
    .select("id, title, body, photo_url, published_at, is_published, created_at, village_id, villages(name)")
    .order("created_at", { ascending: false });
  if (error) return errorResponse("Failed to fetch stories", 500);
  return successResponse(data);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const { userId } = await requireAdmin();
  const body = await req.json() as {
    village_id?: unknown;
    title?: unknown;
    body?: unknown;
    photo_url?: unknown;
    is_published?: unknown;
    published_at?: unknown;
  };

  const { village_id, title, body: storyBody, photo_url, is_published, published_at } = body;

  if (typeof title !== "string" || title.trim().length < 3) {
    return errorResponse("title must be at least 3 characters", 400);
  }
  if (typeof storyBody !== "string" || storyBody.trim().length < 10) {
    return errorResponse("body must be at least 10 characters", 400);
  }
  if (typeof village_id !== "string" || !village_id) {
    return errorResponse("village_id is required", 400);
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("impact_stories")
    .insert({
      village_id,
      title: title.trim(),
      body: storyBody.trim(),
      photo_url: typeof photo_url === "string" ? photo_url : null,
      is_published: is_published === true,
      published_at: is_published === true ? (typeof published_at === "string" ? published_at : new Date().toISOString()) : null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return errorResponse("Failed to create story", 500);
  return successResponse(data, 201);
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  await requireAdmin();
  const body = await req.json() as {
    id?: unknown;
    title?: unknown;
    body?: unknown;
    photo_url?: unknown;
    is_published?: unknown;
    published_at?: unknown;
  };

  const { id, ...updates } = body;
  if (typeof id !== "string" || !id) return errorResponse("id is required", 400);

  const allowed: Record<string, unknown> = {};
  if (typeof updates.title === "string") allowed.title = updates.title.trim();
  if (typeof updates.body === "string") allowed.body = updates.body.trim();
  if (typeof updates.photo_url === "string") allowed.photo_url = updates.photo_url;
  if (typeof updates.is_published === "boolean") {
    allowed.is_published = updates.is_published;
    if (updates.is_published && !updates.published_at) {
      allowed.published_at = new Date().toISOString();
    } else if (!updates.is_published) {
      allowed.published_at = null;
    }
  }
  if (typeof updates.published_at === "string") allowed.published_at = updates.published_at;

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("impact_stories")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error) return errorResponse("Failed to update story", 500);
  return successResponse(data);
});
