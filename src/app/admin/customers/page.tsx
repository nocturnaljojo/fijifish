import { createServerSupabaseClient } from "@/lib/supabase";

async function getUsers() {
  try {
    const supabase = createServerSupabaseClient();
    const { data } = await supabase
      .from("users")
      .select("id, clerk_id, full_name, email, role, country_code, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  } catch {
    return [];
  }
}

const ROLE_COLORS: Record<string, string> = {
  buyer: "#4fc3f7",
  supplier: "#66bb6a",
  driver: "#ffab40",
  admin: "#ce93d8",
};

export default async function CustomersPage() {
  const users = await getUsers();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
        <p className="text-text-secondary text-sm mt-1">
          {users.length} registered users. Full export and broadcast functionality coming in Phase 1b.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Name / Email</th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Role</th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Country</th>
              <th className="text-left px-4 py-3 text-xs font-mono text-text-secondary uppercase tracking-wider">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-text-secondary text-sm">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{u.full_name ?? "—"}</p>
                    <p className="text-xs text-text-secondary">{u.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-mono border"
                      style={{
                        color: ROLE_COLORS[u.role] ?? "#90a4ae",
                        borderColor: `${ROLE_COLORS[u.role] ?? "#90a4ae"}30`,
                        background: `${ROLE_COLORS[u.role] ?? "#90a4ae"}10`,
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">{u.country_code ?? "—"}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs font-mono">
                    {new Date(u.created_at).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
