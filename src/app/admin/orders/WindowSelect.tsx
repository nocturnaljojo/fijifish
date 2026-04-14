"use client";

export type WindowOption = {
  id: string;
  flight_date: string;
  flight_number: string | null;
};

export default function WindowSelect({
  windows,
  selected,
  statusParam,
}: {
  windows: WindowOption[];
  selected: string;
  statusParam?: string;
}) {
  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams();
    if (statusParam) params.set("status", statusParam);
    if (val) params.set("window", val);
    const qs = params.toString();
    window.location.href = `/admin/orders${qs ? `?${qs}` : ""}`;
  }

  return (
    <select
      className="admin-input text-xs py-1.5"
      value={selected}
      onChange={onChange}
    >
      <option value="">All flights</option>
      {windows.map((w) => (
        <option key={w.id} value={w.id}>
          {w.flight_date}{w.flight_number ? ` · ${w.flight_number}` : ""}
        </option>
      ))}
    </select>
  );
}
