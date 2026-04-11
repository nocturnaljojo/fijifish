export default function BroadcastsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-mono text-text-secondary uppercase tracking-widest mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-text-primary">Broadcasts</h1>
        <p className="text-text-secondary text-sm mt-1">
          Send SMS/WhatsApp messages to customer segments. Spam Act 2003 compliant.
        </p>
      </div>

      <div className="py-20 text-center border border-dashed border-white/20 rounded-xl">
        <span className="text-4xl block mb-4" aria-hidden="true">📣</span>
        <p className="text-text-primary font-semibold mb-2">Coming in Phase 1b</p>
        <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
          Broadcast to all buyers, by zone, or by flight window.
          Requires Twilio credentials and customer opt-in setup.
        </p>
      </div>
    </div>
  );
}
