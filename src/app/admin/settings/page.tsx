import { createServerSupabaseClient } from "@/lib/supabase";

async function getDeliveryZones() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("delivery_zones")
      .select("id, name, state, is_active")
      .order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

async function getVillages() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("villages")
      .select("id, name, province, island, is_active")
      .order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  const [zones, villages] = await Promise.all([getDeliveryZones(), getVillages()]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Delivery zones and village configuration.</p>
      </div>

      {/* Delivery zones */}
      <section className="mb-8">
        <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest mb-4">
          Delivery Zones ({zones.length})
        </h2>
        {zones.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center border border-dashed border-white/20 rounded-xl">
            No delivery zones configured. Run the seed migration to populate zones.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/3">
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Zone</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">State</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-b border-white/5">
                    <td className="px-4 py-2.5 text-text-primary">{z.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs font-mono">{z.state}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-mono ${z.is_active ? "text-lagoon-green" : "text-text-secondary"}`}>
                        {z.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Villages */}
      <section>
        <h2 className="text-sm font-mono text-text-secondary uppercase tracking-widest mb-4">
          Villages ({villages.length})
        </h2>
        {villages.length === 0 ? (
          <p className="text-text-secondary text-sm py-6 text-center border border-dashed border-white/20 rounded-xl">
            No villages configured.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/3">
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Village</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Province / Island</th>
                  <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {villages.map((v) => (
                  <tr key={v.id} className="border-b border-white/5">
                    <td className="px-4 py-2.5 font-medium text-text-primary">{v.name}</td>
                    <td className="px-4 py-2.5 text-text-secondary text-xs">{v.province} · {v.island}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-mono ${v.is_active ? "text-lagoon-green" : "text-text-secondary"}`}>
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
