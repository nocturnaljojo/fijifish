import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import CheckoutForm from "./CheckoutForm";

export const metadata = { title: "Checkout — FijiFish" };

export default async function CheckoutPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/checkout");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary, #0a0f1a)" }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <p className="text-xs font-mono text-ocean-teal uppercase tracking-widest mb-1">Checkout</p>
          <h1 className="text-2xl font-bold text-text-primary">Complete Your Order</h1>
        </div>
        <CheckoutForm />
      </div>
    </div>
  );
}
