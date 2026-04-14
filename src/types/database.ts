/**
 * src/types/database.ts
 * TypeScript types matching the Supabase schema.
 * Source of truth: supabase/migrations/
 * Keep in sync with the DB schema — never define these inline in components.
 */

// ── Core domain ───────────────────────────────────────────────────────────────

export interface FishSpecies {
  id: string;
  name_fijian: string | null;
  name_english: string;
  name_scientific: string | null;
  description: string | null;
  cooking_suggestions: string | null;
  default_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Season {
  id: string;
  fish_species_id: string;
  month_start: number;
  month_end: number;
}

export interface Village {
  id: string;
  name: string;
  province: string;
  island: string;
  description: string | null;
  impact_summary: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  suburb: string;
  postcode: string | null;
  state: string | null;
  region: string | null;
  is_active: boolean;
}

// ── Order window ──────────────────────────────────────────────────────────────

export type FlightWindowStatus =
  | "upcoming"
  | "open"
  | "closing_soon"
  | "closed"
  | "packing"
  | "shipped"
  | "in_transit"
  | "landed"
  | "customs"
  | "delivering"
  | "delivered"
  | "cancelled";

export interface FlightWindow {
  id: string;
  flight_date: string;
  flight_number: string | null;
  labasa_departure_time: string | null;
  nadi_departure_time: string | null;
  canberra_arrival_time: string | null;
  order_open_at: string;
  order_close_at: string;
  status: FlightWindowStatus;
  status_updated_at: string;
  notes: string | null;
  created_at: string;
}

export interface InventoryAvailability {
  id: string;
  fish_species_id: string;
  flight_window_id: string;
  village_id: string;
  total_capacity_kg: number;
  reserved_kg: number;
  available_kg: number;
  price_aud_cents: number;
  price_fjd_cents: number;
  confirmed_by_supplier: boolean;
  confirmed_at: string | null;
  updated_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  village_id: string;
  is_active: boolean;
  created_at: string;
}

export interface CatchPhoto {
  id: string;
  supplier_id: string;
  village_id: string;
  fish_species_id: string;
  flight_window_id: string | null;
  image_url: string;
  estimated_weight_kg: number | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export type ShipmentUpdateStatus =
  | "caught"
  | "processing"
  | "packed"
  | "at_airport"
  | "cargo_accepted"
  | "departed"
  | "in_flight"
  | "landed"
  | "customs_cleared"
  | "out_for_delivery"
  | "delivered";

export interface ShipmentUpdate {
  id: string;
  flight_window_id: string;
  village_id: string;
  status: ShipmentUpdateStatus;
  updated_by: string | null;
  photo_url: string | null;
  note: string | null;
  requires_admin_approval: boolean;
  admin_approved: boolean | null;
  admin_approved_by: string | null;
  admin_approved_at: string | null;
  created_at: string;
}

// ── Customers and orders ──────────────────────────────────────────────────────

export interface Customer {
  id: string;
  clerk_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  delivery_zone_id: string | null;
  country_code: string | null;
  role: "buyer" | "supplier" | "driver" | "admin";
  village_id: string | null;
  created_at: string;
}

export type BroadcastChannel = "sms" | "whatsapp" | "both";
export type BroadcastStatus = "draft" | "sending" | "sent" | "failed";
export type BroadcastDeliveryStatus = "queued" | "sent" | "delivered" | "failed" | "unsubscribed";

export interface Broadcast {
  id: string;
  sent_by: string | null;
  audience_filter: Record<string, unknown>;
  channels: BroadcastChannel;
  message_text: string;
  recipient_count: number;
  estimated_cost_aud_cents: number;
  sent_at: string | null;
  status: BroadcastStatus;
  created_at: string;
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  customer_id: string;
  channel_used: "sms" | "whatsapp";
  delivery_status: BroadcastDeliveryStatus;
  sent_at: string | null;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "payment_failed"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface Order {
  id: string;
  customer_id: string;
  flight_window_id: string;
  delivery_zone_id: string;
  delivery_run_id: string | null;
  status: OrderStatus;
  total_aud_cents: number;
  delivery_fee_aud_cents: number;
  stripe_payment_intent_id: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  placed_at: string;
  delivered_at: string | null;
  rating: number | null;
  feedback_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  fish_species_id: string;
  village_id: string;
  quantity_kg: number;
  price_per_kg_aud_cents: number;
  price_per_kg_fjd_cents: number;
  created_at: string;
}

// ── Catch traceability ────────────────────────────────────────────────────────

export interface CatchBatch {
  id: string;
  batch_code: string;
  flight_window_id: string | null;
  village_id: string | null;
  fish_species_id: string | null;
  fisher_name: string | null;
  catch_date: string | null;
  catch_method: string | null;
  weight_kg: number | null;
  photo_url: string | null;
  video_url: string | null;
  qr_code_url: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface VillageMedia {
  id: string;
  village_id: string;
  catch_batch_id: string | null;
  fish_species_id: string | null;
  uploader_clerk_id: string | null;
  storage_path: string;
  public_url: string | null;
  caption: string | null;
  category: "catch" | "village" | "delivery" | "impact";
  is_approved: boolean;
  approved_by_clerk_id: string | null;
  approved_at: string | null;
  created_at: string;
}

// ── Community ─────────────────────────────────────────────────────────────────

export interface FishInterestVote {
  id: string;
  fish_species_id: string;
  voter_clerk_id: string | null;
  voter_session_id: string | null;
  created_at: string;
}

export interface FishInterestSummary {
  fish_species_id: string;
  name_fijian: string | null;
  name_english: string;
  vote_count: number;
}

export interface CustomerFeedback {
  id: string;
  customer_clerk_id: string | null;
  feedback_type: "general" | "delivery" | "quality" | "pricing" | "species_request" | "website";
  message: string;
  rating: number | null;
  created_at: string;
}

export interface ImpactStory {
  id: string;
  village_id: string;
  title: string;
  body: string;
  image_url: string | null;
  published_at: string | null;
  is_published: boolean;
  created_at: string;
}
