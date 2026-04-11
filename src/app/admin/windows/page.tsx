import { createServerSupabaseClient } from "@/lib/supabase";
import { CreateWindowForm, WindowRow } from "./WindowForm";

async function getAllWindows() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("flight_windows")
      .select("id, flight_date, flight_number, order_open_at, order_close_at, status, notes")
      .order("flight_date", { ascending: false });
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function WindowsPage() {
  const windows = await getAllWindows();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-text-primary">Flight Windows</h1>
          <p className="text-text-secondary text-sm mt-1">
            Each window drives the live countdown, cargo bar, and order availability on the homepage.
          </p>
        </div>
        <CreateWindowForm />
      </div>

      <div className="flex flex-col gap-3">
        {windows.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-white/20 rounded-xl">
            <p className="text-text-secondary text-sm">No flight windows yet.</p>
            <p className="text-text-secondary text-xs mt-1">Create one above to start taking orders.</p>
          </div>
        ) : (
          windows.map((w) => (
            <WindowRow key={w.id} window={w} />
          ))
        )}
      </div>
    </div>
  );
}
